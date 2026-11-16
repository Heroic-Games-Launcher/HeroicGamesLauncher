import type { Runner } from 'common/types'
import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import StoreBadge from '.'

const runners: Runner[] = [
  'legendary',
  'gog',
  'nile',
  'zoom',
  'itchio',
  'sideload'
]

const meta = {
  title: 'Atoms/StoreBadge',
  component: StoreBadge,
  args: { runner: 'gog' },
  argTypes: {
    runner: { control: 'select', options: runners }
  }
} satisfies Meta<typeof StoreBadge>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const EveryStore: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      {runners.map((runner) => (
        <StoreBadge key={runner} runner={runner} title={runner} />
      ))}
    </div>
  )
}

export const WithTitle: Story = {
  args: { runner: 'itchio', title: 'itch.io' },
  play: async ({ canvas }) => {
    await expect(canvas.getByTitle('itch.io')).toBeInTheDocument()
  }
}
