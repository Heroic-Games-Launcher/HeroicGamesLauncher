import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { AppErrorScreen } from '.'

const sampleError = new TypeError(
  "Cannot read properties of undefined (reading 'toUpperCase')"
)
sampleError.stack = [
  "TypeError: Cannot read properties of undefined (reading 'toUpperCase')",
  '    at Library/index.tsx:71:20',
  '    at Array.sort (<anonymous>)'
].join('\n')

const meta = {
  title: 'Feedback/AppErrorBoundary',
  component: AppErrorScreen,
  args: {
    error: sampleError,
    route: '/',
    onGoToLibrary: () => undefined
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Crash screen used as the router error element. It shows the error, the route and version it happened on, and offers one-click access to the Heroic log for bug reports.'
      }
    }
  }
} satisfies Meta<typeof AppErrorScreen>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const OffersReportActions: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { name: /Unexpected application error/i })
    ).toBeInTheDocument()
    await expect(canvas.getByRole('alert')).toHaveTextContent(
      /reading 'toUpperCase'/
    )
    await expect(
      canvas.getByRole('button', { name: /Copy error report/i })
    ).toBeInTheDocument()
    await expect(
      canvas.getByRole('button', { name: /Copy Heroic log/i })
    ).toBeInTheDocument()
    await expect(
      canvas.getByRole('button', { name: /Open log folder/i })
    ).toBeInTheDocument()
  }
}

export const WithoutRouteActions: Story = {
  args: {
    error: 'The application could not be loaded.',
    route: undefined,
    onGoToLibrary: undefined
  }
}
