import type { Release } from 'common/types'
import { expect, fn, screen } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { ChangelogModal } from '.'

const release: Release = {
  html_url: 'https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher',
  name: 'Heroic 2.22.4 — Hajrudin',
  tag_name: 'v2.22.4',
  published_at: '2026-10-28T00:00:00Z',
  prerelease: false,
  id: 1,
  type: 'stable',
  body: [
    '## Added',
    '- itch.io store integration',
    '- Settings to disable the discounts page',
    '',
    '## Fixed',
    '- Gamepad navigation in the library filters',
    '- Contrast of the sidebar on light themes'
  ].join('\n')
}

const meta = {
  title: 'Overlays/ChangelogModal',
  component: ChangelogModal,
  args: {
    onClose: fn(),
    dimissVersionCheck: true
  },
  beforeEach: () => {
    window.api.getCurrentChangelog = () => Promise.resolve(release)
    return () => {
      delete (window.api as Partial<typeof window.api>).getCurrentChangelog
    }
  },
  parameters: {
    docs: {
      story: { inline: false, height: '620px' },
      description: {
        component:
          'Release notes shown after an update. The markdown body comes straight from the GitHub release.'
      }
    }
  }
} satisfies Meta<typeof ChangelogModal>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const RendersTheMarkdownBody: Story = {
  play: async () => {
    await expect(
      await screen.findByRole('heading', { name: release.name })
    ).toBeInTheDocument()
    await expect(
      await screen.findByText('itch.io store integration')
    ).toBeInTheDocument()
  }
}

export const NothingWithoutARelease: Story = {
  beforeEach: () => {
    window.api.getCurrentChangelog = () => Promise.resolve(null)
    return () => {
      delete (window.api as Partial<typeof window.api>).getCurrentChangelog
    }
  },
  play: async () => {
    await expect(screen.queryByRole('dialog')).toBeNull()
  }
}
