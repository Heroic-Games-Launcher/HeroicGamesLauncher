import type { Meta, StoryObj } from '@storybook/react-vite'

import FilterSection from '.'
import Chip from '../Chip'

const meta = {
  title: 'Navigation/FilterSection',
  component: FilterSection,
  args: {
    label: 'Platform',
    children: (
      <>
        <Chip active>Windows</Chip>
        <Chip>macOS</Chip>
        <Chip>Linux</Chip>
        <Chip>Browser</Chip>
      </>
    )
  }
} satisfies Meta<typeof FilterSection>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithoutLabel: Story = {
  args: { label: undefined }
}

export const Stacked: Story = {
  render: (args) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        maxWidth: '20rem'
      }}
    >
      <FilterSection {...args} />
      <FilterSection label="Store">
        <Chip active>Epic Games</Chip>
        <Chip>GOG</Chip>
        <Chip>Amazon</Chip>
        <Chip>itch.io</Chip>
      </FilterSection>
      <FilterSection label="Status">
        <Chip>Installed</Chip>
        <Chip>Needs update</Chip>
        <Chip>Favourites</Chip>
      </FilterSection>
    </div>
  )
}
