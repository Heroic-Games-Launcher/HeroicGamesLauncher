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
    'Small hotfix to fix the GOG Login and UMU issue.',
    '',
    "## What's Changed",
    '- itch.io store integration by @flavioislima in https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/pull/5706',
    '- Settings to disable the discounts page by @arielj in https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/pull/5979',
    '- Gamepad navigation in the library filters by @CommandMC in https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/pull/5915',
    '',
    '## New Contributors',
    '- @wehrwolfmann made their first contribution in https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/pull/5793',
    '',
    '**Full Changelog**: https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/compare/v2.22.3...v2.22.4'
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
      await screen.findByText(/itch.io store integration/)
    ).toBeInTheDocument()
    await expect(await screen.findByText('@wehrwolfmann')).toBeInTheDocument()
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
