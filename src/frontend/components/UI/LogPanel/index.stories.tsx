import type { Meta, StoryObj } from '@storybook/react-vite'

import LogPanel from '.'

const sampleLog = [
  '(19:12:03) [INFO]:   [Backend]:   Launching installer in prefix',
  '(19:12:03) [INFO]:   [Wine]:      wine: created the configuration directory',
  '(19:12:04) [WARN]:   [Wine]:      fixme:winediag: wine-staging not detected',
  '(19:12:05) [INFO]:   [Setup]:     Extracting files...',
  '(19:12:07) [ERR]:    [Wine]:      err:module: failed to load library',
  '(19:12:08) [INFO]:   [Setup]:     Installation finished'
].join('\n')

const meta = {
  title: 'Atoms/LogPanel',
  component: LogPanel,
  args: {
    content: sampleLog
  },
  decorators: [
    (Story) => (
      <div style={{ height: '240px', width: '520px' }}>
        <Story />
      </div>
    )
  ]
} satisfies Meta<typeof LogPanel>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = {
  args: { content: '' }
}

export const Truncated: Story = {
  args: {
    content: Array.from(
      { length: 40 },
      (_, i) => `(19:12:${String(i).padStart(2, '0')}) [INFO]: line ${i + 1}`
    ).join('\n'),
    maxLines: 10
  }
}
