import type { Meta, StoryObj } from '@storybook/react-vite'

import SpecCard from '.'
import DetailList from '../DetailList'

const meta = {
  title: 'Data Display/SpecCard',
  component: SpecCard,
  args: {
    title: 'Minimum requirements',
    children: (
      <DetailList
        items={[
          { label: 'OS', value: 'Windows 10 64-bit' },
          { label: 'CPU', value: 'Intel Core i5-2300' },
          { label: 'Memory', value: '8 GB RAM' },
          { label: 'GPU', value: 'NVIDIA GeForce GTX 660' }
        ]}
      />
    )
  }
} satisfies Meta<typeof SpecCard>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const SideBySide: Story = {
  render: (args) => (
    <div
      style={{
        display: 'grid',
        gap: '1rem',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))'
      }}
    >
      <SpecCard {...args} />
      <SpecCard {...args} title="Recommended requirements">
        <DetailList
          items={[
            { label: 'OS', value: 'Windows 11 64-bit' },
            { label: 'CPU', value: 'Intel Core i7-8700' },
            { label: 'Memory', value: '16 GB RAM' },
            { label: 'GPU', value: 'NVIDIA GeForce RTX 3060' }
          ]}
        />
      </SpecCard>
    </div>
  )
}

export const WithMedia: Story = {
  args: {
    title: 'ProtonDB',
    media: (
      <span
        style={{
          background: 'var(--status-success)',
          borderRadius: 'var(--radius-pill)',
          color: 'var(--neutral-01)',
          fontWeight: 'var(--bold)',
          padding: '0.25rem 0.75rem'
        }}
      >
        Platinum
      </span>
    ),
    children: 'Runs out of the box with Proton Experimental.'
  }
}
