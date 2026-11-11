import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import LanguageSelector, { FlagPosition } from '.'

const meta = {
  title: 'Forms/LanguageSelector',
  component: LanguageSelector,
  argTypes: {
    flagPossition: {
      control: 'inline-radio',
      options: Object.values(FlagPosition)
    }
  },
  parameters: {
    docs: {
      description: {
        component:
          'Language picker backed by the locale files in public/locales. Flags are optional and can sit on either side of the label.'
      }
    }
  }
} satisfies Meta<typeof LanguageSelector>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithPrependedFlags: Story = {
  args: { flagPossition: FlagPosition.PREPEND }
}

export const WithAppendedFlags: Story = {
  args: { flagPossition: FlagPosition.APPEND }
}

export const WithWeblateLink: Story = {
  args: { showWeblateLink: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId('buttonWeblate')).toBeInTheDocument()
  }
}
