import { ReactNode, useContext } from 'react'
import ContextProvider from 'frontend/state/ContextProvider'
import { expect, fn, screen } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import ExternalLinkDialog from '.'

function WithDialogOpen({
  children,
  linkCallback
}: {
  children: ReactNode
  linkCallback?: () => void
}) {
  const appContext = useContext(ContextProvider)

  return (
    <ContextProvider.Provider
      value={{
        ...appContext,
        externalLinkDialogOptions: { showDialog: true, linkCallback }
      }}
    >
      {children}
    </ContextProvider.Provider>
  )
}

const meta = {
  title: 'Overlays/ExternalLinkDialog',
  component: ExternalLinkDialog,
  parameters: {
    docs: {
      description: {
        component:
          'Confirmation shown before Heroic hands a link to the system browser. It is driven by the global context, so the stories provide their own.'
      }
    }
  }
} satisfies Meta<typeof ExternalLinkDialog>

export default meta

type Story = StoryObj<typeof meta>

export const Open: Story = {
  render: () => (
    <WithDialogOpen>
      <ExternalLinkDialog />
    </WithDialogOpen>
  )
}

const linkCallback = fn()

export const ContinueRunsTheCallback: Story = {
  render: () => (
    <WithDialogOpen linkCallback={linkCallback}>
      <ExternalLinkDialog />
    </WithDialogOpen>
  ),
  beforeEach: () => {
    linkCallback.mockClear()
  },
  play: async ({ userEvent }) => {
    await userEvent.click(
      await screen.findByRole('button', { name: 'Continue' })
    )
    await expect(linkCallback).toHaveBeenCalledTimes(1)
  }
}

export const HiddenWhenNotRequested: Story = {
  render: () => <ExternalLinkDialog />,
  play: async () => {
    await expect(screen.queryByRole('dialog')).toBeNull()
  }
}
