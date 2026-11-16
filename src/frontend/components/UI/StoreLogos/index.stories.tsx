import type { Runner } from 'common/types'
import type { Meta, StoryObj } from '@storybook/react-vite'

import StoreLogos from '.'

const runners: Runner[] = [
  'legendary',
  'gog',
  'nile',
  'zoom',
  'itchio',
  'sideload'
]

const meta = {
  title: 'Atoms/StoreLogos',
  component: StoreLogos,
  args: { runner: 'legendary' },
  argTypes: {
    runner: { control: 'select', options: runners }
  },
  parameters: {
    docs: {
      description: {
        component:
          'Maps a runner to its store logo. Anything unrecognised falls back to the Heroic mark, which is what sideloaded games use.'
      }
    }
  }
} satisfies Meta<typeof StoreLogos>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const AllRunners: Story = {
  render: () => (
    <div style={{ alignItems: 'center', display: 'flex', gap: '2rem' }}>
      {runners.map((runner) => (
        <span
          key={runner}
          style={{
            alignItems: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            width: '4rem'
          }}
        >
          <StoreLogos className="store-icon" runner={runner} />
          <small>{runner}</small>
        </span>
      ))}
    </div>
  )
}
