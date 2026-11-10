import { ReactNode, useContext } from 'react'
import ContextProvider from 'frontend/state/ContextProvider'
import { expect, fn, screen } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import DialogHandler from '.'

function WithDialog({
  children,
  message,
  title
}: {
  children: ReactNode
  message: string
  title: string
}) {
  const appContext = useContext(ContextProvider)

  return (
    <ContextProvider.Provider
      value={{
        ...appContext,
        dialogModalOptions: {
          showDialog: true,
          title,
          message,
          type: 'MESSAGE',
          buttons: [{ text: 'Ok', onClick: fn() }]
        }
      }}
    >
      {children}
    </ContextProvider.Provider>
  )
}

const meta = {
  title: 'Overlays/DialogHandler',
  component: DialogHandler,
  parameters: {
    docs: {
      story: { inline: false, height: '440px' },
      description: {
        component:
          'Mounted once in the app shell, it listens for dialog requests from the backend and renders them as a MessageBoxModal.'
      }
    }
  }
} satisfies Meta<typeof DialogHandler>

export default meta

type Story = StoryObj<typeof meta>

export const WithAnOpenDialog: Story = {
  render: () => (
    <WithDialog
      message="Heroic needs to restart to apply this change."
      title="Restart required"
    >
      <DialogHandler />
    </WithDialog>
  ),
  play: async () => {
    await expect(
      await screen.findByRole('heading', { name: 'Restart required' })
    ).toBeInTheDocument()
  }
}

export const NothingWhenIdle: Story = {
  render: () => <DialogHandler />,
  play: async () => {
    await expect(screen.queryByRole('dialog')).toBeNull()
  }
}
