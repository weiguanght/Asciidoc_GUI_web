import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// ESM 环境下 __dirname 兼容
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
    hmr: {
      protocol: 'ws',
      port: 3000,
    },
  },
  plugins: [react()],
  base: '/Asciidoc_GUI_web/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    }
  }
});