import { expect, fn } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import Table, { type TableColumn } from '.'
import Badge from '../Badge'
import EmptyState from '../EmptyState'
import StoreBadge from '../StoreBadge'
import type { Runner } from 'common/types'

interface Row {
  appName: string
  title: string
  runner: Runner
  size: string
  installed: boolean
}

const rows: Row[] = [
  {
    appName: 'hollow-knight',
    title: 'Hollow Knight',
    runner: 'gog',
    size: '9.2 GB',
    installed: true
  },
  {
    appName: 'hades',
    title: 'Hades',
    runner: 'legendary',
    size: '15.4 GB',
    installed: true
  },
  {
    appName: 'celeste',
    title: 'Celeste',
    runner: 'itchio',
    size: '1.3 GB',
    installed: false
  },
  {
    appName: 'disco-elysium',
    title: 'Disco Elysium',
    runner: 'nile',
    size: '22.8 GB',
    installed: false
  }
]

const columns: TableColumn<Row>[] = [
  {
    key: 'store',
    header: 'Store',
    width: '5rem',
    align: 'center',
    render: (row) => <StoreBadge runner={row.runner} title={row.runner} />
  },
  { key: 'title', header: 'Game', render: (row) => row.title },
  {
    key: 'size',
    header: 'Size',
    align: 'end',
    collapseOnNarrow: true,
    render: (row) => row.size
  },
  {
    key: 'status',
    header: 'Status',
    align: 'end',
    render: (row) => (
      <Badge variant={row.installed ? 'success' : 'neutral'}>
        {row.installed ? 'Installed' : 'Not installed'}
      </Badge>
    )
  }
]

const meta = {
  title: 'Data Display/Table',
  component: Table,
  args: {
    columns,
    rows,
    rowKey: (row: Row) => row.appName
  },
  argTypes: {
    density: { control: 'inline-radio', options: ['comfortable', 'compact'] }
  },
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Generic data table with a sticky header, a skeleton loading state and an empty slot. Columns declare their own renderer so callers never build cells by hand.'
      }
    }
  }
} satisfies Meta<typeof Table<Row>>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Compact: Story = {
  args: { density: 'compact' }
}

export const WithCaption: Story = {
  args: { caption: 'Games in your library' }
}

export const Loading: Story = {
  args: { loading: true, loadingRows: 4 }
}

export const Empty: Story = {
  args: {
    rows: [],
    empty: <EmptyState title="No games match these filters" />
  }
}

export const ClickableRows: Story = {
  args: { onRowClick: fn() },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByText('Hades'))
    await expect(args.onRowClick).toHaveBeenCalledWith(rows[1])
  }
}

export const RowsRespondToEnter: Story = {
  args: { onRowClick: fn() },
  play: async ({ args, canvas, userEvent }) => {
    const [, hadesRow] = canvas.getAllByRole('row')

    hadesRow.focus()
    await userEvent.keyboard('{Enter}')
    await expect(args.onRowClick).toHaveBeenCalledTimes(1)
  }
}
