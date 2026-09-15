import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, normalizePath } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import path from 'path'
import { createRequire } from 'module'

const require = createRequire(import.meta.url);
const pdfjsDistPath = path.dirname(require.resolve('pdfjs-dist/package.json'));

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    viteStaticCopy({
      targets: [
        {
          src: normalizePath(path.join(pdfjsDistPath, 'build', 'pdf.worker.min.mjs')),
          dest: 'pdfjs'
        },
        {
          src: normalizePath(path.join(pdfjsDistPath, 'wasm', '*')),
          dest: 'pdfjs'
        }
      ]
    })
  ],
})
