import { resolve } from "node:path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const topicsDir = resolve(import.meta.dirname, "../topics");

// topics/는 gallery 밖이라 Vite가 파일 추가와 삭제를 감시하지 않는다.
// 주제를 모으는 중에 갤러리를 다시 시작하지 않아도 새 주제가 보이도록 감시를 더하고 페이지를 새로 읽힌다.
function watchTopics(): Plugin {
  return {
    name: "today-ref-watch-topics",
    configureServer(server) {
      server.watcher.add(topicsDir);
      const reload = (file: string) => {
        if (!file.startsWith(topicsDir)) return;
        server.moduleGraph.invalidateAll();
        server.ws.send({ type: "full-reload" });
      };
      server.watcher.on("add", reload);
      server.watcher.on("unlink", reload);
      server.watcher.on("change", reload);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), watchTopics()],
  // 캡처는 저장소 밖에 두는 로컬 파일이라 번들에 넣지 않고 /<주제 id>/<파일>로 그대로 제공한다.
  publicDir: "../captures",
  server: {
    port: 4319,
    strictPort: true,
    // 주제 파일과 공통 형식(topic.ts)이 gallery 폴더 밖에 있다.
    fs: { allow: [".."] },
  },
});
