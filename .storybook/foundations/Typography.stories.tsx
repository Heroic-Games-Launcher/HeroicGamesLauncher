import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { Page, Section, TokenTable, useTokenValues } from './TokenPreview'

const sizes = [
  '--text-xs',
  '--text-sm',
  '--text-md',
  '--text-ml',
  '--text-lg',
  '--text-xl',
  '--text-2xl',
  '--text-3xl',
  '--text-4xl'
] as const

const semanticSizes = [
  '--eyebrow',
  '--body-sm',
  '--body-md',
  '--body-lg',
  '--title-sm',
  '--title-md',
  '--title-lg',
  '--display-md',
  '--display-lg',
  '--button-sm',
  '--button-md'
] as const

const weights = [
  '--light',
  '--regular',
  '--medium',
  '--semibold',
  '--bold',
  '--extrabold'
] as const

const leading = [
  '--leading-tight',
  '--leading-snug',
  '--leading-normal'
] as const

const families = ['--primary-font-family', '--secondary-font-family'] as const

const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const

const utilityClasses = [
  'subtitle',
  'subtitle-sm',
  'content',
  'content-sm',
  'caption',
  'status',
  'button-md',
  'button-sm'
] as const

const meta = {
  title: 'Foundations/Typography',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The type scale uses a 1.2 ratio on a 16px root, declared in styles/_typography.scss. Semantic aliases are what components should reach for.'
      }
    }
  }
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

export const Scale: Story = {
  render: () => (
    <Page>
      <Section title="Raw sizes">
        <TokenTable
          tokens={sizes}
          preview={(token) => (
            <span style={{ fontSize: `var(${token})`, lineHeight: 1.2 }}>
              Heroic Games Launcher
            </span>
          )}
        />
      </Section>
      <Section
        title="Semantic sizes"
        description="Prefer these over the raw sizes, they carry the intent."
      >
        <TokenTable
          tokens={semanticSizes}
          preview={(token) => (
            <span style={{ fontSize: `var(${token})`, lineHeight: 1.2 }}>
              Heroic Games Launcher
            </span>
          )}
        />
      </Section>
    </Page>
  )
}

export const Weights: Story = {
  render: () => (
    <Page>
      <Section title="Weights">
        <TokenTable
          tokens={weights}
          preview={(token) => (
            <span
              style={{
                fontWeight: `var(${token})`,
                fontSize: 'var(--text-lg)'
              }}
            >
              Heroic Games Launcher
            </span>
          )}
        />
      </Section>
      <Section title="Line heights">
        <TokenTable
          tokens={leading}
          preview={(token) => (
            <span
              style={{
                display: 'block',
                lineHeight: `var(${token})`,
                maxWidth: '24rem'
              }}
            >
              An open source game launcher for Epic, GOG, Amazon and itch.io
              libraries.
            </span>
          )}
        />
      </Section>
      <Section title="Families">
        <TokenTable
          tokens={families}
          preview={(token) => (
            <span
              style={{
                fontFamily: `var(${token})`,
                fontSize: 'var(--text-lg)'
              }}
            >
              Heroic Games Launcher
            </span>
          )}
        />
      </Section>
    </Page>
  )
}

export const Headings: Story = {
  render: () => (
    <Page>
      <Section
        title="Headings"
        description="Global element styles from styles/_typography.scss."
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-sm-fixed)'
          }}
        >
          {headings.map((tag) => {
            const Tag = tag
            return <Tag key={tag}>{tag} — Heroic Games Launcher</Tag>
          })}
        </div>
      </Section>
      <Section title="Utility classes">
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-sm-fixed)'
          }}
        >
          {utilityClasses.map((name) => (
            <span className={name} key={name}>
              .{name} — Heroic Games Launcher
            </span>
          ))}
        </div>
      </Section>
    </Page>
  )
}

function SizeProbe() {
  const values = useTokenValues(sizes)

  return (
    <ul>
      {sizes.map((token) => (
        <li key={token}>{values[token] || ''}</li>
      ))}
    </ul>
  )
}

export const ScaleIsMonotonic: Story = {
  tags: ['!autodocs'],
  render: () => <SizeProbe />,
  play: async ({ canvas }) => {
    const items = await canvas.findAllByRole('listitem')
    const pixels = items.map((item) =>
      Number.parseFloat(item.textContent ?? '')
    )

    await expect(pixels).toHaveLength(sizes.length)
    for (const [index, value] of pixels.entries()) {
      await expect(value).toBeGreaterThan(0)
      if (index > 0) {
        await expect(value).toBeGreaterThan(pixels[index - 1])
      }
    }
  }
}
