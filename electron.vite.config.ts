import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react-swc'
import svgr from 'vite-plugin-svgr'
import path from 'path'

import type { Plugin } from 'vite'

const srcAliases = ['backend', 'frontend', 'common'].map((aliasName) => ({
  find: aliasName,
  replacement: path.join(__dirname, 'src', aliasName)
}))

const dependenciesToNotExternalize = [
  '@xhmikosr/decompress',
  '@xhmikosr/decompress-targz',
  '@xhmikosr/decompress-unzip'
]

// FIXME: Potentially publish this as a dedicated plugin, if other projects
//        run into the same issue
const vite_plugin_react_dev_tools: Plugin = {
  name: 'react-dev-tools-replace',
  transformIndexHtml: {
    handler: (html) =>
      html.replace(
        '<!-- REACT_DEVTOOLS_SCRIPT -->',
        '<script src="http://localhost:8097"></script>'
      )
  }
}

export default defineConfig(({ mode }) => ({
  main: {
    build: {
      rollupOptions: {
        input: 'src/backend/main.ts'
      },
      outDir: 'build/main',
      minify: true,
      sourcemap: mode === 'development' ? 'inline' : false,
      externalizeDeps: { exclude: dependenciesToNotExternalize }
    },
    resolve: { alias: srcAliases },
    plugins: []
  },
  preload: {
    build: {
      rollupOptions: {
        input: 'src/preload/index.ts'
      },
      outDir: 'build/preload',
      minify: true,
      sourcemap: mode === 'development' ? 'inline' : false,
      externalizeDeps: { exclude: dependenciesToNotExternalize }
    },
    resolve: { alias: srcAliases },
    plugins: []
  },
  renderer: {
    root: '.',
    build: {
      rollupOptions: {
        input: path.resolve('index.html')
      },
      target: 'esnext',
      outDir: 'build',
      emptyOutDir: false,
      minify: true,
      sourcemap: mode === 'development' ? 'inline' : false
    },
    resolve: { alias: srcAliases },
    plugins: [
      react(),
      svgr(),
      mode !== 'production' && vite_plugin_react_dev_tools
    ]
  }
}))
