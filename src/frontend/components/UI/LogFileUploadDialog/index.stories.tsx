import useGlobalState from 'frontend/state/GlobalStateV2'
import { expect, screen } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import LogFileUploadDialog from '.'

const meta = {
  title: 'Overlays/LogFileUploadDialog',
  component: LogFileUploadDialog,
  parameters: {
    docs: {
      story: { inline: false, height: '420px' },
      description: {
        component:
          'Asks for confirmation before a log file leaves the machine, then shows the paste link once the upload finishes. It is driven by the global uploadLogFileProps state.'
      }
    }
  }
} satisfies Meta<typeof LogFileUploadDialog>

export default meta

type Story = StoryObj<typeof meta>

export const Confirmation: Story = {
  beforeEach: () => {
    useGlobalState.setState({
      uploadLogFileProps: {
        name: 'heroic-main.log',
        logFileArgs: { appName: 'hollow-knight', runner: 'legendary' }
      }
    })
    return () => useGlobalState.setState({ uploadLogFileProps: false })
  },
  play: async () => {
    await expect(await screen.findByRole('dialog')).toHaveTextContent(
      'heroic-main.log'
    )
  }
}

export const HiddenWhenIdle: Story = {
  beforeEach: () => {
    useGlobalState.setState({ uploadLogFileProps: false })
  },
  play: async () => {
    await expect(screen.queryByRole('dialog')).toBeNull()
  }
}
