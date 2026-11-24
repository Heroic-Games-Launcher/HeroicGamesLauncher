import type { Meta, StoryObj } from '@storybook/react-vite'

import Skeleton from '.'

const meta = {
  title: 'Atoms/Skeleton',
  component: Skeleton,
  args: {
    width: '12rem',
    height: '1em'
  },
  parameters: {
    docs: {
      description: {
        component:
          'Loading placeholder. It is always aria-hidden, so the surrounding region needs its own live status for screen readers.'
      }
    }
  }
} satisfies Meta<typeof Skeleton>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const TextBlock: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <Skeleton height="1.5em" width="60%" />
      <Skeleton />
      <Skeleton />
      <Skeleton width="80%" />
    </div>
  )
}

export const CardGrid: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gap: '1rem',
        gridTemplateColumns: 'repeat(4, 1fr)'
      }}
    >
      {Array.from({ length: 8 }, (_, index) => (
        <div
          key={index}
          style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
        >
          <Skeleton height="10rem" radius="12px" />
          <Skeleton height="0.9em" width="70%" />
        </div>
      ))}
    </div>
  )
}

export const Circle: Story = {
  args: { width: '3rem', height: '3rem', radius: '50%' }
}
