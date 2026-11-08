import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import DismissibleBanner from '.'

const variants = ['info', 'accent', 'success', 'warning', 'error'] as const

const meta = {
  title: 'Feedback/DismissibleBanner',
  component: DismissibleBanner,
  args: {
    storageKey: 'storybook-dismissible-banner',
    children: 'Cloud saves are experimental for sideloaded games.',
    variant: 'warning'
  },
  argTypes: {
    variant: { control: 'select', options: variants }
  },
  parameters: {
    docs: {
      description: {
        component:
          'A full-width notice the user can close for good. The dismissal is remembered in localStorage under the storageKey, so each banner needs its own key.'
      }
    }
  },
  beforeEach: () => {
    localStorage.removeItem('storybook-dismissible-banner')
  }
} satisfies Meta<typeof DismissibleBanner>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithTitle: Story = {
  args: {
    title: 'Experimental feature',
    children: 'Cloud saves are experimental for sideloaded games.'
  }
}

export const Variants: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {variants.map((variant) => (
        <DismissibleBanner
          {...args}
          key={variant}
          storageKey={`storybook-banner-${variant}`}
          title="Banner title"
          variant={variant}
        >
          Message
        </DismissibleBanner>
      ))}
    </div>
  ),
  beforeEach: () => {
    variants.forEach((variant) =>
      localStorage.removeItem(`storybook-banner-${variant}`)
    )
  }
}

export const TitleOnly: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {variants.map((variant) => (
        <DismissibleBanner
          {...args}
          key={variant}
          storageKey={`storybook-banner-short-${variant}`}
          variant={variant}
        >
          Banner title
        </DismissibleBanner>
      ))}
    </div>
  ),
  beforeEach: () => {
    variants.forEach((variant) =>
      localStorage.removeItem(`storybook-banner-short-${variant}`)
    )
  }
}

export const DismissingRemovesItAndRemembers: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Close' }))

    await expect(canvasElement).not.toHaveTextContent('Cloud saves')
    await expect(localStorage.getItem('storybook-dismissible-banner')).toBe(
      'true'
    )
  }
}
