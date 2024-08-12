import path from 'path'

import { externalizeDepsPlugin } from 'electron-vite'
import type { UserConfig } from 'vite'

const srcAliases = {
  backend: path.join(__dirname, '..', 'src', 'backend'),
  frontend: path.join(__dirname, '..', 'src', 'frontend'),
  common: path.join(__dirname, '..', 'src', 'common')
}

const getMainViteConfig = (mode: string): UserConfig => ({
  build: {
    rollupOptions: {
      input: 'src/backend/main.ts'
    },
    outDir: 'build/main',
    minify: true,
    sourcemap: mode === 'development' ? 'inline' : false
  },
  resolve: { alias: srcAliases },
  plugins: [externalizeDepsPlugin()]
})

export { srcAliases }
export default getMainViteConfig
