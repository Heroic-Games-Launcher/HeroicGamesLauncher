import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import SectionHeader from '.'
import Button from '../Button'
import Chip from '../Chip'

const meta = {
  title: 'Navigation/SectionHeader',
  component: SectionHeader,
  args: {
    title: 'Recently played'
  }
} satisfies Meta<typeof SectionHeader>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithSubtitle: Story = {
  args: { subtitle: '12 games' }
}

export const WithActions: Story = {
  args: {
    subtitle: '12 games',
    actions: (
      <>
        <Chip>Installed</Chip>
        <Button size="sm" variant="ghost">
          See all
        </Button>
      </>
    )
  }
}

export const TitleIsAHeading: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { level: 2, name: 'Recently played' })
    ).toBeInTheDocument()
  }
}
