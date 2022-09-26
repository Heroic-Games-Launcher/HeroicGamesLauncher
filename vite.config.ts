import { defineConfig } from 'vite'
import electron from 'vite-plugin-electron'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'path'

export default defineConfig({
  build: {
    outDir: 'build'
  },
  resolve: {
    alias: {
      '~@fontsource': path.resolve(__dirname, 'node_modules/@fontsource')
    }
  },
  plugins: [
    react(),
    electron({
      main: {
        entry: 'src/backend/main.ts'
      },
      preload: {
        input: {
          preload: path.resolve(__dirname + '/src/backend/preload.ts')
        }
      }
    }),
    svgr(),
    tsconfigPaths({ loose: true })
  ]
})
