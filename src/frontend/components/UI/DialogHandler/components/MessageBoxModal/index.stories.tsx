import { expect, fn, screen } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import MessageBoxModal from '.'

const meta = {
  title: 'Overlays/MessageBoxModal',
  component: MessageBoxModal,
  args: {
    title: 'Game not found',
    message: 'Heroic could not find the install folder for this game.',
    type: 'MESSAGE',
    buttons: [{ text: 'Ok', onClick: fn() }],
    onClose: fn()
  },
  argTypes: {
    type: { control: 'inline-radio', options: ['MESSAGE', 'ERROR'] }
  },
  parameters: {
    docs: {
      description: {
        component:
          'The dialog the backend drives through the showDialog channel. Newlines in the message are turned into paragraphs, and the first button defaults to the primary variant.'
      }
    }
  }
} satisfies Meta<typeof MessageBoxModal>

export default meta

type Story = StoryObj<typeof meta>

export const Message: Story = {}

export const ErrorType: Story = {
  args: {
    type: 'ERROR',
    title: 'Installation failed',
    message:
      'Legendary exited with code 1.\nCheck the game log for the full output.'
  }
}

export const MultipleButtons: Story = {
  args: {
    title: 'Remove this game from the queue?',
    buttons: [
      { text: 'Remove', onClick: fn(), variant: 'danger' },
      { text: 'Keep it', onClick: fn() }
    ]
  }
}

export const RichMessage: Story = {
  args: {
    message: (
      <>
        <p>Three games could not be synced.</p>
        <ul>
          <li>Hollow Knight</li>
          <li>Hades</li>
          <li>Celeste</li>
        </ul>
      </>
    )
  }
}

export const ButtonClosesAndRunsItsHandler: Story = {
  play: async ({ args, userEvent }) => {
    await userEvent.click(await screen.findByRole('button', { name: 'Ok' }))

    await expect(args.onClose).toHaveBeenCalledTimes(1)
    await expect(args.buttons[0].onClick).toHaveBeenCalledTimes(1)
  }
}
