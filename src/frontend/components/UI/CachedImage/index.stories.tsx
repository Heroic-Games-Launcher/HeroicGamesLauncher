import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import CachedImage from '.'

const meta = {
  title: 'Data Display/CachedImage',
  component: CachedImage,
  args: {
    src: 'icon.png',
    alt: 'Heroic logo',
    width: 160,
    height: 160
  },
  parameters: {
    docs: {
      description: {
        component:
          'Image loader that routes remote URLs through the imagecache:// protocol, falls back to the direct URL, then to the fallback image. Local sources are loaded as-is.'
      }
    }
  }
} satisfies Meta<typeof CachedImage>

export default meta

type Story = StoryObj<typeof meta>

export const LocalSource: Story = {}

export const WithFallback: Story = {
  args: {
    src: 'does-not-exist.png',
    fallback: 'icon.png'
  },
  play: async ({ canvas }) => {
    const image = canvas.getByAltText('Heroic logo')

    await expect(image).toHaveAttribute('loading', 'lazy')
  }
}

export const RemoteSourceUsesTheCache: Story = {
  args: { src: 'https://example.com/cover.jpg' },
  play: async ({ canvas }) => {
    const image = canvas.getByAltText('Heroic logo')

    await expect(image.getAttribute('src')).toContain('imagecache://')
  }
}
