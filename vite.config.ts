import { defineConfig, UserConfigExport } from 'vite'
import electron from 'vite-plugin-electron'
import react from '@vitejs/plugin-react-swc'
import svgr from 'vite-plugin-svgr'
import path from 'path'

const srcAliases = ['backend', 'frontend', 'common'].map((srcFolder) => {
  return {
    find: srcFolder,
    replacement: path.resolve(__dirname, `./src/${srcFolder}`)
  }
})

const electronViteConfig: UserConfigExport = {
  build: { outDir: 'build/electron', target: 'esnext' },
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
    target: 'esnext',
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
        vite: electronViteConfig,
        onstart: ({ reload }) => reload()
      }
    ]),
    svgr()
  ]
})
