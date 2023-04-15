import { defineConfig, BuildOptions } from 'vite'
import electron from 'vite-plugin-electron'
import react from '@vitejs/plugin-react-swc'
import svgr from 'vite-plugin-svgr'
import * as path from 'path'

const srcAliases = ['backend', 'frontend', 'common'].map((srcFolder) => {
  return {
    find: srcFolder,
    replacement: path.resolve(__dirname, `./src/${srcFolder}`)
  }
})
srcAliases.push({
  find: '~@fontsource',
  replacement: path.resolve(__dirname, 'node_modules/@fontsource')
})

const otherBuildOptions: BuildOptions = {
  reportCompressedSize: false,
  target: 'esnext'
}

export default defineConfig({
  build: {
    outDir: 'build',
    ...otherBuildOptions
  },
  resolve: {
    alias: srcAliases
  },
  plugins: [
    react(),
    electron([
      {
        entry: 'src/backend/main.ts',
        vite: {
          build: {
            outDir: 'build/main',
            ...otherBuildOptions
          },
          resolve: {
            alias: srcAliases
          },
          clearScreen: false
        }
      },
      {
        entry: 'src/backend/preload.ts',
        vite: {
          build: {
            outDir: 'build/preload',
            ...otherBuildOptions
          },
          resolve: {
            alias: srcAliases
          },
          clearScreen: false
        },
        onstart: ({ reload }) => reload()
      }
    ]),
    svgr()
  ]
})
