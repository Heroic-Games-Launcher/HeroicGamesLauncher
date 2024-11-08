import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react-swc'
import svgr from 'vite-plugin-svgr'
import path from 'path'

import { mergeConfig, type Plugin } from 'vite'
import getMainViteConfig, {
  srcAliases,
  getPatternsToReplace
} from './meta/getMainViteConfig'
import replace from '@rollup/plugin-replace'

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
  main: getMainViteConfig(mode),
  preload: mergeConfig(getMainViteConfig(mode), {
    build: {
      rollupOptions: {
        input: 'src/backend/preload.ts'
      },
      outDir: 'build/preload'
    }
  }),
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
      replace({
        preventAssignment: true,
        values: getPatternsToReplace(mode)
      }),
      mode !== 'production' && vite_plugin_react_dev_tools
    ]
  }
}))
