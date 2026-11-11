import { expect, fn, screen } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { Modal, ModalContent, ModalFooter, ModalHeader } from '.'
import Alert from '../Alert'
import Button from '../Button'

const meta = {
  title: 'Overlays/Modal',
  component: Modal,
  args: {
    onClose: fn(),
    showCloseButton: true,
    children: (
      <>
        <ModalHeader>Uninstall Hollow Knight?</ModalHeader>
        <ModalContent>
          This removes the game files from disk. Cloud saves are kept.
        </ModalContent>
        <ModalFooter>
          <Button variant="ghost">Cancel</Button>
          <Button variant="danger">Uninstall</Button>
        </ModalFooter>
      </>
    )
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    tone: {
      control: 'inline-radio',
      options: ['default', 'destructive', 'error']
    }
  },
  parameters: {
    docs: {
      story: { inline: false, height: '480px' },
      description: {
        component:
          'Dialog shell built on the MUI Dialog. Header, content and footer are separate exports so every dialog in the app lays out the same way.'
      }
    }
  }
} satisfies Meta<typeof Modal>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Small: Story = {
  args: { size: 'sm' }
}

export const Large: Story = {
  args: { size: 'lg' }
}

export const Destructive: Story = {
  args: { tone: 'destructive' }
}

export const ErrorTone: Story = {
  args: {
    tone: 'error',
    children: (
      <>
        <ModalHeader>Could not launch the game</ModalHeader>
        <ModalContent>
          <Alert variant="error">
            Wine exited with code 53. Check the game log for details.
          </Alert>
        </ModalContent>
        <ModalFooter>
          <Button>Open log</Button>
        </ModalFooter>
      </>
    )
  }
}

export const StackedFooter: Story = {
  args: {
    children: (
      <>
        <ModalHeader>Choose an install location</ModalHeader>
        <ModalContent>Heroic needs 9.2 GB of free space.</ModalContent>
        <ModalFooter layout="stacked">
          <Button fullWidth>Use the default folder</Button>
          <Button fullWidth variant="ghost">
            Pick another folder
          </Button>
        </ModalFooter>
      </>
    )
  }
}

export const CloseButtonCallsOnClose: Story = {
  play: async ({ args, userEvent }) => {
    await userEvent.click(await screen.findByLabelText('close'))
    await expect(args.onClose).toHaveBeenCalledTimes(1)
  }
}

export const HeaderIsAHeading: Story = {
  play: async () => {
    await expect(
      await screen.findByRole('heading', { name: 'Uninstall Hollow Knight?' })
    ).toBeInTheDocument()
  }
}
