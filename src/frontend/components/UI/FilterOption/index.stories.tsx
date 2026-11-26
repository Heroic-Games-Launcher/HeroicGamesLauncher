import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import FilterOption, { FilterOptionList } from '.'

const meta = {
  title: 'Navigation/FilterOption',
  component: FilterOption,
  args: {
    label: 'GOG',
    checked: true,
    onChange: () => undefined,
    onOnly: () => undefined,
    onlyLabel: 'only'
  },
  decorators: [
    (Story) => (
      <FilterOptionList>
        <Story />
      </FilterOptionList>
    )
  ]
} satisfies Meta<typeof FilterOption>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithoutOnly: Story = {
  args: { onOnly: undefined, onlyLabel: undefined, label: 'Installed only' }
}

function InteractiveList() {
  const [checked, setChecked] = useState<Record<string, boolean>>({
    GOG: true,
    'Epic Games': false,
    Steam: false
  })

  return (
    <FilterOptionList>
      {Object.keys(checked).map((store) => (
        <FilterOption
          key={store}
          label={store}
          checked={checked[store]}
          onChange={() =>
            setChecked((current) => ({ ...current, [store]: !current[store] }))
          }
          onOnly={() =>
            setChecked(
              Object.fromEntries(
                Object.keys(checked).map((key) => [key, key === store])
              )
            )
          }
          onlyLabel="only"
        />
      ))}
    </FilterOptionList>
  )
}

export const Interactive: Story = {
  render: () => <InteractiveList />
}
