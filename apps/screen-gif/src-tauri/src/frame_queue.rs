//! 캡처 스레드와 GIF 변환 스레드 사이에서 프레임을 넘기는 큐.
//!
//! 캡처 쪽은 기다리지 않아야 한다. windows-capture는 프레임 버퍼가 하나라서 콜백이 늦으면
//! 그동안 바뀐 화면을 받지 못한다(QA-002). 그래서 큐가 가득 차면 넣는 쪽을 막지 않고 가장 오래된
//! 프레임을 버린다. 가장 최근 화면은 항상 남으므로 녹화를 멈춘 시점의 화면은 잃지 않는다.

use std::{
    collections::VecDeque,
    sync::{Condvar, Mutex},
};

pub struct FrameQueue<T> {
    state: Mutex<State<T>>,
    ready: Condvar,
    capacity: usize,
}

struct State<T> {
    items: VecDeque<T>,
    phase: Phase,
    dropped: usize,
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
enum Phase {
    Open,
    /// 더 받지 않고, 남은 항목은 꺼내 준다.
    Closed,
    /// 더 받지 않고, 남은 항목도 버린다.
    Aborted,
}

impl<T> FrameQueue<T> {
    pub fn new(capacity: usize) -> Self {
        assert!(capacity > 0, "큐 크기는 1 이상이어야 합니다");
        Self {
            state: Mutex::new(State {
                items: VecDeque::with_capacity(capacity),
                phase: Phase::Open,
                dropped: 0,
            }),
            ready: Condvar::new(),
            capacity,
        }
    }

    /// 항목을 넣는다. 가득 차 있으면 가장 오래된 항목을 버린다. 닫힌 뒤에 넣은 항목은 버린다.
    pub fn push(&self, item: T) {
        let mut state = self.state.lock().unwrap();
        if state.phase != Phase::Open {
            return;
        }
        if state.items.len() == self.capacity {
            state.items.pop_front();
            state.dropped += 1;
        }
        state.items.push_back(item);
        self.ready.notify_one();
    }

    /// 항목이 올 때까지 기다려 꺼낸다. 닫혀서 더 꺼낼 것이 없으면 `None`.
    pub fn pop(&self) -> Option<T> {
        let mut state = self.state.lock().unwrap();
        loop {
            match state.phase {
                Phase::Aborted => return None,
                Phase::Closed => return state.items.pop_front(),
                Phase::Open => {
                    if let Some(item) = state.items.pop_front() {
                        return Some(item);
                    }
                    state = self.ready.wait(state).unwrap();
                }
            }
        }
    }

    /// 더 받지 않는다. 남은 항목은 `pop`으로 마저 꺼낼 수 있다.
    pub fn close(&self) {
        self.set_phase(Phase::Closed);
    }

    /// 더 받지 않고 남은 항목도 버린다.
    pub fn abort(&self) {
        self.set_phase(Phase::Aborted);
    }

    /// 큐가 가득 차서 버린 항목 수
    pub fn dropped(&self) -> usize {
        self.state.lock().unwrap().dropped
    }

    fn set_phase(&self, phase: Phase) {
        let mut state = self.state.lock().unwrap();
        state.phase = phase;
        if phase == Phase::Aborted {
            state.items.clear();
        }
        self.ready.notify_all();
    }
}

#[cfg(test)]
mod tests {
    use std::{sync::Arc, thread, time::Duration};

    use super::FrameQueue;

    #[test]
    fn a_full_queue_drops_the_oldest_and_keeps_the_newest() {
        let queue = FrameQueue::new(2);
        queue.push(1);
        queue.push(2);
        queue.push(3);

        queue.close();
        assert_eq!(queue.pop(), Some(2));
        assert_eq!(queue.pop(), Some(3));
        assert_eq!(queue.pop(), None);
        assert_eq!(queue.dropped(), 1);
    }

    #[test]
    fn close_still_hands_out_the_remaining_items() {
        let queue = FrameQueue::new(4);
        queue.push("a");
        queue.close();
        queue.push("after close");

        assert_eq!(queue.pop(), Some("a"));
        assert_eq!(queue.pop(), None);
    }

    #[test]
    fn abort_discards_the_remaining_items() {
        let queue = FrameQueue::new(4);
        queue.push(1);
        queue.abort();

        assert_eq!(queue.pop(), None);
    }

    #[test]
    fn pop_waits_until_an_item_arrives() {
        let queue = Arc::new(FrameQueue::new(4));
        let consumer = {
            let queue = Arc::clone(&queue);
            thread::spawn(move || queue.pop())
        };
        thread::sleep(Duration::from_millis(50));
        queue.push(7);

        assert_eq!(consumer.join().unwrap(), Some(7));
    }
}
