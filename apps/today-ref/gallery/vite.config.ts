import { resolve } from "node:path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

import { capturesDir } from "../scripts/captures.ts";
import { galleryApp, galleryPort, identityPath, topicsDirOf } from "../scripts/gallery.ts";

const topicsDir = topicsDirOf(resolve(import.meta.dirname, ".."));

// pnpm gallery(scripts/gallery.ts)가 포트에 떠 있는 서버를 재사용할지 정하도록 어느 사본의 주제를 보여 주는지 답한다.
function identify(): Plugin {
  return {
    name: "today-ref-identify",
    configureServer(server) {
      server.middlewares.use(identityPath, (_request, response) => {
        response.setHeader("content-type", "application/json");
        response.end(JSON.stringify({ app: galleryApp, topicsDir }));
      });
    },
  };
}

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
  plugins: [react(), tailwindcss(), watchTopics(), identify()],
  // 캡처는 공개 저장소 밖(비공개 캡처 저장소나 이 사본의 captures/)에 두므로 번들에 넣지 않고 /<주제 id>/<파일>로 그대로 제공한다.
  publicDir: capturesDir(resolve(import.meta.dirname, "..")),
  server: {
    port: galleryPort,
    strictPort: true,
    // 주제 파일과 공통 형식(topic.ts)이 gallery 폴더 밖에 있다.
    fs: { allow: [".."] },
  },
});
