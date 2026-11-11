import { Settings } from 'lucide-react'
import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import PageHeader from '.'
import Button from '../Button'
import Icon from '../Icon'

const meta = {
  title: 'Navigation/PageHeader',
  component: PageHeader,
  args: {
    title: 'Hollow Knight'
  }
} satisfies Meta<typeof PageHeader>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithDescription: Story = {
  args: {
    description: 'Team Cherry · Released 24 February 2017'
  }
}

export const WithBackLink: Story = {
  args: {
    backTo: '/',
    backLabel: 'Back to library',
    description: 'Team Cherry · Released 24 February 2017'
  }
}

export const WithActions: Story = {
  args: {
    backTo: '/',
    backLabel: 'Back to library',
    actions: (
      <>
        <Button
          aria-label="Game settings"
          icon={<Icon glyph={Settings} size="sm" />}
          variant="ghost"
        />
        <Button>Play</Button>
      </>
    )
  }
}

export const BackLinkIsLabelled: Story = {
  args: { backTo: '/', backLabel: 'Back to library' },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('link', { name: 'Back to library' })
    ).toHaveAttribute('href', '/')
  }
}
