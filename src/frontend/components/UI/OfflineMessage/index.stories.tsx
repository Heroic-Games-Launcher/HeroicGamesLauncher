import { ReactNode, useContext } from 'react'
import ContextProvider from 'frontend/state/ContextProvider'
import type { ConnectivityStatus } from 'common/types'
import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import OfflineMessage from '.'

function WithConnectivity({
  children,
  retryIn = 0,
  status
}: {
  children: ReactNode
  retryIn?: number
  status: ConnectivityStatus
}) {
  const appContext = useContext(ContextProvider)

  return (
    <ContextProvider.Provider
      value={{ ...appContext, connectivity: { status, retryIn } }}
    >
      {children}
    </ContextProvider.Provider>
  )
}

const meta = {
  title: 'Feedback/OfflineMessage',
  component: OfflineMessage,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The connectivity banner pinned to the top of the window. It renders nothing while the app is online, which is why every story here forces a status.'
      }
    }
  }
} satisfies Meta<typeof OfflineMessage>

export default meta

type Story = StoryObj<typeof meta>

export const Offline: Story = {
  render: () => (
    <WithConnectivity status="offline">
      <OfflineMessage />
    </WithConnectivity>
  )
}

export const Retrying: Story = {
  render: () => (
    <WithConnectivity status="check-online">
      <OfflineMessage />
    </WithConnectivity>
  )
}

export const RetryingWithCountdown: Story = {
  render: () => (
    <WithConnectivity retryIn={12} status="check-online">
      <OfflineMessage />
    </WithConnectivity>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/12 seconds/)).toBeInTheDocument()
  }
}

export const HiddenWhenOnline: Story = {
  render: () => (
    <WithConnectivity status="online">
      <OfflineMessage />
    </WithConnectivity>
  ),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('.offline-message')).toBeNull()
  }
}
