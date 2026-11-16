import type { Meta, StoryObj } from '@storybook/react-vite'

import { Page, Section, TokenTable } from './TokenPreview'

const radii = [
  '--radius-none',
  '--radius-xs',
  '--radius-sm',
  '--radius-md',
  '--radius-lg',
  '--radius-xl',
  '--radius-pill',
  '--radius-circle'
] as const

const aliases = ['--radius-default', '--radius-interactive'] as const

const sample = (token: string) => (
  <span
    style={{
      background: 'var(--panel-surface)',
      border: '1px solid var(--accent)',
      borderRadius: `var(${token})`,
      display: 'block',
      height: '3rem',
      width: '6rem'
    }}
  />
)

const meta = {
  title: 'Foundations/Radius',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Corner radii from styles/_radius.scss. Components should use the aliases so a single change restyles the whole app.'
      }
    }
  }
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

export const Scale: Story = {
  render: () => (
    <Page>
      <Section title="Scale">
        <TokenTable tokens={radii} preview={sample} />
      </Section>
      <Section
        title="Aliases"
        description="--radius-default for surfaces, --radius-interactive for controls."
      >
        <TokenTable tokens={aliases} preview={sample} />
      </Section>
    </Page>
  )
}
