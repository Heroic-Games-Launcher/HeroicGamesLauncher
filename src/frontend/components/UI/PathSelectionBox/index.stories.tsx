import { useState } from 'react'
import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import PathSelectionBox from '.'

const meta = {
  title: 'Forms/PathSelectionBox',
  component: PathSelectionBox,
  args: {
    htmlId: 'path-selection-story',
    label: 'Default install path',
    placeholder: '~/Games/Heroic',
    pathDialogTitle: 'Choose an install folder',
    type: 'directory',
    path: '',
    onPathChange: () => undefined
  },
  parameters: {
    docs: {
      description: {
        component:
          'File and folder picker. The icon opens the native dialog while a path is empty, and clears the path once one is set.'
      }
    }
  }
} satisfies Meta<typeof PathSelectionBox>

export default meta

type Story = StoryObj<typeof meta>

function Controlled(props: Parameters<typeof PathSelectionBox>[0]) {
  const [path, setPath] = useState(props.path)

  return <PathSelectionBox {...props} onPathChange={setPath} path={path} />
}

export const Empty: Story = {
  render: (args) => <Controlled {...args} />
}

export const WithPath: Story = {
  render: (args) => <Controlled {...args} path="/home/deck/Games/Heroic" />
}

export const FileSelection: Story = {
  render: (args) => (
    <Controlled
      {...args}
      label="Wine prefix"
      pathDialogTitle="Choose an executable"
      placeholder="/path/to/game.exe"
      type="file"
    />
  )
}

export const ReadOnlyPath: Story = {
  render: (args) => (
    <Controlled {...args} canEditPath={false} path="/usr/share/heroic" />
  )
}

export const ClearingResetsThePath: Story = {
  render: (args) => <Controlled {...args} path="/home/deck/Games/Heroic" />,
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByLabelText('Default install path')

    await expect(input).toHaveValue('/home/deck/Games/Heroic')
    await userEvent.click(canvas.getByRole('button'))
    await expect(input).toHaveValue('')
  }
}
