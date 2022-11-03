import { defineConfig } from 'vite'
import electron from 'vite-plugin-electron'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import path from 'path'

const srcAliases = ['backend', 'frontend', 'common'].map((srcFolder) => {
  return {
    find: srcFolder,
    replacement: path.resolve(__dirname, `./src/${srcFolder}`)
  }
})

const electronViteConfig = {
  build: { outDir: 'build/electron' },
  resolve: {
    alias: [
      {
        find: '~@fontsource',
        replacement: path.resolve(__dirname, 'node_modules/@fontsource')
      },
      ...srcAliases
    ]
  }
}

export default defineConfig({
  build: {
    outDir: 'build'
  },
  resolve: {
    alias: [
      {
        find: '~@fontsource',
        replacement: path.resolve(__dirname, 'node_modules/@fontsource')
      },
      ...srcAliases
    ]
  },
  plugins: [
    react(),
    electron([
      {
        entry: 'src/backend/main.ts',
        vite: electronViteConfig
      },
      {
        entry: 'src/backend/preload.ts',
        vite: electronViteConfig
      }
    ]),
    svgr()
  ]
})
