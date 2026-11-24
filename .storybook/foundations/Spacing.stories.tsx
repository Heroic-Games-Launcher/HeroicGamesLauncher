import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { Page, Section, TokenTable, useTokenValues } from './TokenPreview'

const relative = [
  '--space-3xs',
  '--space-2xs',
  '--space-xs',
  '--space-sm',
  '--space-md',
  '--space-lg',
  '--space-xl',
  '--space-2xl',
  '--space-3xl'
] as const

const fixed = [
  '--space-3xs-fixed',
  '--space-2xs-fixed',
  '--space-xs-fixed',
  '--space-sm-fixed',
  '--space-md-fixed',
  '--space-lg-fixed',
  '--space-xl-fixed',
  '--space-2xl-fixed',
  '--space-3xl-fixed',
  '--space-4xl-fixed',
  '--space-5xl-fixed'
] as const

const bar = (token: string) => (
  <span
    style={{
      background: 'var(--accent)',
      borderRadius: 'var(--radius-pill)',
      display: 'block',
      height: '0.75rem',
      width: `var(${token})`
    }}
  />
)

const meta = {
  title: 'Foundations/Spacing',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Two spacing ramps live in styles/_spacing.scss. The em-based ramp scales with the surrounding font size, the -fixed ramp does not.'
      }
    }
  }
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

export const Relative: Story = {
  render: () => (
    <Page>
      <Section
        title="Relative scale"
        description="em based, so padding grows with the text it wraps. Use inside components."
      >
        <TokenTable tokens={relative} preview={bar} />
      </Section>
    </Page>
  )
}

export const Fixed: Story = {
  render: () => (
    <Page>
      <Section
        title="Fixed scale"
        description="px based. Use for layout gaps that should not react to font size."
      >
        <TokenTable tokens={fixed} preview={bar} />
      </Section>
    </Page>
  )
}

export const Stack: Story = {
  render: () => (
    <Page>
      <Section
        title="Gaps side by side"
        description="Each column uses the matching fixed token as its gap."
      >
        <div
          style={{
            display: 'grid',
            gap: 'var(--space-md-fixed)',
            gridTemplateColumns: 'repeat(auto-fill, minmax(10rem, 1fr))'
          }}
        >
          {fixed.map((token) => (
            <div
              key={token}
              style={{
                background: 'var(--panel-background)',
                border: '1px solid var(--panel-border)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: `var(${token})`,
                padding: 'var(--space-sm-fixed)'
              }}
            >
              <span
                style={{
                  color: 'var(--on-panel-muted)',
                  fontSize: 'var(--text-xs)'
                }}
              >
                {token}
              </span>
              <span style={{ background: 'var(--accent)', height: '0.5rem' }} />
              <span style={{ background: 'var(--accent)', height: '0.5rem' }} />
              <span style={{ background: 'var(--accent)', height: '0.5rem' }} />
            </div>
          ))}
        </div>
      </Section>
    </Page>
  )
}

function FixedProbe() {
  const values = useTokenValues(fixed)

  return (
    <ul>
      {fixed.map((token) => (
        <li key={token}>{values[token] || ''}</li>
      ))}
    </ul>
  )
}

export const FixedScaleIsMonotonic: Story = {
  tags: ['!autodocs'],
  render: () => <FixedProbe />,
  play: async ({ canvas }) => {
    const items = await canvas.findAllByRole('listitem')
    const pixels = items.map((item) =>
      Number.parseFloat(item.textContent ?? '')
    )

    await expect(pixels).toHaveLength(fixed.length)
    for (const [index, value] of pixels.entries()) {
      if (index > 0) {
        await expect(value).toBeGreaterThan(pixels[index - 1])
      }
    }
  }
}
