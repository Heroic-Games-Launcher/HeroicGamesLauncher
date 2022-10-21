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
    electron({
      main: {
        entry: 'src/backend/main.ts',
        vite: {
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
      },
      preload: {
        input: {
          preload: path.resolve(__dirname + '/src/backend/preload.ts')
        }
      }
    }),
    svgr()
  ]
})
