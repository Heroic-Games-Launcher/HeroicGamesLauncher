import { useState } from 'react'
import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { TableInput, type ColumnProps } from '.'

const meta = {
  title: 'Forms/TwoColTableInput',
  component: TableInput,
  args: {
    htmlId: 'table-input-story',
    label: 'Environment variables',
    header: { key: 'Variable name', value: 'Value' },
    inputPlaceHolder: { key: 'DXVK_HUD', value: 'fps' },
    rows: [],
    onChange: () => undefined
  },
  parameters: {
    docs: {
      description: {
        component:
          'Key/value editor used for environment variables and Wine launch arguments. Rows are only committed when the add button is pressed.'
      }
    }
  }
} satisfies Meta<typeof TableInput>

export default meta

type Story = StoryObj<typeof meta>

function Controlled(props: Parameters<typeof TableInput>[0]) {
  const [rows, setRows] = useState<ColumnProps[]>(props.rows)

  return <TableInput {...props} onChange={setRows} rows={rows} />
}

export const Empty: Story = {
  render: (args) => <Controlled {...args} />
}

export const WithRows: Story = {
  render: (args) => (
    <Controlled
      {...args}
      rows={[
        { key: 'DXVK_HUD', value: 'fps,memory' },
        { key: 'MANGOHUD', value: '1' },
        { key: 'PROTON_LOG', value: '1' }
      ]}
    />
  )
}

export const WithConnector: Story = {
  render: (args) => (
    <Controlled
      {...args}
      connector="="
      info="Paste NAME=value and Heroic splits it for you."
      rows={[{ key: 'WINEDEBUG', value: '-all' }]}
    />
  )
}

export const WithValidation: Story = {
  render: (args) => (
    <Controlled
      {...args}
      validation={(key) => [
        key.includes(' ') ? 'Variable names cannot contain spaces' : '',
        ''
      ]}
    />
  )
}

export const AddingARowAppendsIt: Story = {
  render: (args) => <Controlled {...args} />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText('Variable name'), 'MANGOHUD')
    await userEvent.type(canvas.getByLabelText('Value'), '1')
    await userEvent.click(canvas.getByRole('button', { name: 'Add' }))

    await expect(canvas.getByText('MANGOHUD')).toBeInTheDocument()
  }
}
