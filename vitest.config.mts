import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        plugins: [await storybookTest()],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }]
          }
        }
      }
    ]
  }
})
