interface Window {
  __TAURI__?: {
    core: {
      invoke<T>(command: string, args: ArrayBuffer | Record<string, unknown>): Promise<T>;
      Channel: new <T>() => { onmessage: (message: T) => void };
    };
  };
}
