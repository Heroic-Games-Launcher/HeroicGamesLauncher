import path from 'path'

import { externalizeDepsPlugin } from 'electron-vite'
import type { UserConfig } from 'vite'
import replace, { type Replacement } from '@rollup/plugin-replace'

const srcAliases = {
  backend: path.join(__dirname, '..', 'src', 'backend'),
  frontend: path.join(__dirname, '..', 'src', 'frontend'),
  common: path.join(__dirname, '..', 'src', 'common')
}

const getPatternsToReplace = (mode: string): Record<string, Replacement> => {
  let [, buildPlatform] = mode.split('__')
  // If there is no build platform in the mode string, assume the current platform
  if (!buildPlatform) buildPlatform = process.platform

  return {
    'process.platform': JSON.stringify(buildPlatform),
    isWindows: `${buildPlatform === 'win32'}`,
    isMac: `${buildPlatform === 'darwin'}`,
    isLinux: `${buildPlatform === 'linux'}`
  }
}

const getMainViteConfig = (mode: string): UserConfig => ({
  build: {
    rollupOptions: {
      input: 'src/backend/main.ts'
    },
    outDir: 'build/main',
    minify: true,
    sourcemap: mode.startsWith('development') ? 'inline' : false
  },
  resolve: { alias: srcAliases },
  plugins: [
    replace({
      preventAssignment: true,
      values: getPatternsToReplace(mode)
    }),
    externalizeDepsPlugin()
  ]
})

export { srcAliases, getPatternsToReplace }
export default getMainViteConfig
