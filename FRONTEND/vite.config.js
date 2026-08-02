import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const copyManifest = () => ({
  name: 'copy-manifest',
  closeBundle() {
    mkdirSync(resolve('dist'), { recursive: true })
    copyFileSync(resolve('manifest.json'), resolve('dist/manifest.json'))
  },
})

export default defineConfig({
  plugins: [react(), copyManifest()],
  server: {
    open: '/popup.html',
  },
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: { popup: resolve('popup.html') },
    },
  },
})
