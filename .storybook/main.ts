import path from 'node:path'
import react from '@vitejs/plugin-react-swc'
import svgr from 'vite-plugin-svgr'
import type { StorybookConfig } from '@storybook/react-vite'

const srcAliases = ['backend', 'frontend', 'common'].map((aliasName) => ({
  find: aliasName,
  replacement: path.resolve(process.cwd(), 'src', aliasName)
}))

const config: StorybookConfig = {
  stories: [
    '../.storybook/foundations/*.stories.tsx',
    '../src/frontend/**/*.stories.@(ts|tsx)'
  ],
  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
    '@storybook/addon-vitest'
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {}
  },
  core: {
    disableTelemetry: true
  },
  staticDirs: ['../public'],
  async viteFinal(baseConfig) {
    const { mergeConfig } = await import('vite')

    return mergeConfig(baseConfig, {
      plugins: [react(), svgr()],
      resolve: { alias: srcAliases, dedupe: ['react', 'react-dom'] },
      optimizeDeps: {
        entries: [
          '.storybook/preview.tsx',
          '.storybook/foundations/*.stories.tsx',
          'src/frontend/**/*.{ts,tsx}'
        ]
      },
      define: { 'process.env': {} },
      publicDir: false
    })
  }
}

export default config
