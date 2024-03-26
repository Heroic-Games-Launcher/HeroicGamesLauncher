import { defineConfig, type Plugin, type UserConfigExport } from 'vite'
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

// FIXME: Potentially publish this as a dedicated plugin, if other projects
//        run into the same issue
const vite_plugin_react_dev_tools: Plugin = {
  name: 'react-dev-tools-replace',
  transformIndexHtml: {
    transform: (html) =>
      html.replace(
        '<!-- REACT_DEVTOOLS_SCRIPT -->',
        '<script src="http://localhost:8097"></script>'
      )
  }
}

export default defineConfig(({ mode }) => ({
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
    svgr(),
    mode !== 'production' && vite_plugin_react_dev_tools
  ]
}))
