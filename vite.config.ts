import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { cpSync, readFileSync } from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import {defineConfig} from 'vite';

const projectDirectory = path.dirname(fileURLToPath(import.meta.url));
const packageVersion = JSON.parse(readFileSync(path.join(projectDirectory, 'package.json'), 'utf8')).version as string;

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'package-canonical-docs',
        writeBundle() {
          cpSync(path.join(projectDirectory, 'docs'), path.join(projectDirectory, 'dist/docs'), { recursive: true });
        },
      },
    ],
    define: {
      __APP_VERSION__: JSON.stringify(packageVersion),
    },
    resolve: {
      alias: {
        '@': path.resolve(projectDirectory, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify: file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      // Mermaid's parser is loaded only when the plan diagram is opened. Its
      // 662 kB minified chunk is 143 kB over the wire and is not initial code.
      chunkSizeWarningLimit: 700,
    },
  };
});
