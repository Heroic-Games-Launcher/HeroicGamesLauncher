import { ArrowUpRight, Coffee, Heart, Mail } from 'lucide-react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import FeatureCard from '.'
import Badge from '../Badge'
import Button from '../Button'
import Icon from '../Icon'
import IconBadge from '../IconBadge'

const openAction = (
  <Button
    variant="ghost"
    size="md"
    fullWidth
    icon={<Icon glyph={ArrowUpRight} size="sm" />}
  >
    Open
  </Button>
)

const meta = {
  title: 'Data Display/FeatureCard',
  component: FeatureCard,
  args: {
    title: 'Patreon',
    description: 'Recurring membership with behind-the-scenes updates.',
    icon: <IconBadge glyph={Heart} />,
    meta: <Badge variant="neutral">Membership</Badge>,
    action: openAction
  },
  argTypes: {
    icon: { table: { disable: true } },
    meta: { table: { disable: true } },
    action: { table: { disable: true } }
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '320px' }}>
        <Story />
      </div>
    )
  ]
} satisfies Meta<typeof FeatureCard>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const TitleOnly: Story = {
  args: {
    icon: <IconBadge glyph={Coffee} />,
    meta: undefined,
    action: undefined
  }
}

export const Grid: Story = {
  decorators: [
    (Story) => (
      <div
        style={{
          display: 'grid',
          gap: '1rem',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))'
        }}
      >
        <Story />
      </div>
    )
  ],
  render: (args) => (
    <>
      <FeatureCard {...args} />
      <FeatureCard
        {...args}
        icon={<IconBadge glyph={Coffee} />}
        title="Ko-fi"
        description="A one-time tip that goes straight into development."
        meta={<Badge variant="neutral">One-time tip</Badge>}
      />
      <FeatureCard
        {...args}
        icon={<IconBadge glyph={Mail} />}
        title="Email us"
        description="contact@heroicgameslauncher.com"
        meta={undefined}
        action={
          <Button
            variant="primary"
            size="md"
            fullWidth
            icon={<Icon glyph={Mail} size="sm" />}
          >
            Send email
          </Button>
        }
      />
    </>
  )
}
