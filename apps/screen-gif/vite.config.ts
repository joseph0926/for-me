import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Tauri가 이 포트를 devUrl로 연다. 다른 포트로 바뀌면 앱이 화면을 찾지 못한다.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    // Rust 쪽은 Tauri CLI가 감시한다. Windows에서는 컴파일 중 잠긴 target 파일을 감시하려다 EBUSY가 난다.
    watch: { ignored: ["**/target/**", "**/src-tauri/**", "**/encoder/**"] },
  },
});
