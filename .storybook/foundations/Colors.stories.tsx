import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { Page, Ramp, Section, Swatches, useTokenValues } from './TokenPreview'

const textTokens = [
  '--text-neutral',
  '--text-neutral-muted',
  '--text-neutral-faint',
  '--text-brand',
  '--text-accent',
  '--text-success',
  '--text-warning',
  '--text-destructive',
  '--text-on-brand'
] as const

const backgroundTokens = [
  '--bg-surface',
  '--bg-surface-raised',
  '--bg-brand',
  '--bg-brand-subtle',
  '--bg-accent',
  '--bg-accent-subtle',
  '--bg-success',
  '--bg-success-subtle',
  '--bg-warning',
  '--bg-warning-subtle',
  '--bg-destructive',
  '--bg-destructive-subtle',
  '--bg-info-subtle',
  '--bg-disabled'
] as const

const iconTokens = [
  '--icon-neutral',
  '--icon-neutral-muted',
  '--icon-brand',
  '--icon-accent',
  '--icon-success',
  '--icon-warning',
  '--icon-destructive'
] as const

const borderTokens = [
  '--border-subtle',
  '--border-brand',
  '--border-accent',
  '--border-success',
  '--border-warning',
  '--border-destructive'
] as const

const roleTokens = [
  '--role-brand',
  '--role-accent',
  '--role-success',
  '--role-warning',
  '--role-destructive',
  '--role-info'
] as const

const brandPrimitives = [
  '--brand-primary',
  '--brand-primary-hover',
  '--brand-primary-tint-01',
  '--brand-primary-tint-02',
  '--brand-primary-tint-03'
] as const

const accentPrimitives = [
  '--brand-secondary',
  '--brand-secondary-hover',
  '--brand-secondary-tint-01',
  '--brand-secondary-tint-02'
] as const

const neutralPrimitives = [
  '--neutral-01',
  '--neutral-02',
  '--neutral-03',
  '--neutral-04',
  '--neutral-05',
  '--neutral-06',
  '--neutral-07',
  '--neutral-08'
] as const

const successPrimitives = [
  '--status-success',
  '--status-success-hover'
] as const
const warningPrimitives = [
  '--status-warning',
  '--status-warning-hover'
] as const
const destructivePrimitives = [
  '--status-danger',
  '--status-danger-hover'
] as const
const infoPrimitives = [
  '--status-info',
  '--status-info-hover',
  '--status-default',
  '--status-default-hover'
] as const

const surfaceTokens = [
  '--body-background',
  '--background',
  '--background-darker',
  '--background-lighter',
  '--input-background',
  '--modal-background',
  '--panel-surface',
  '--panel-background',
  '--panel-glass',
  '--panel-border',
  '--panel-divider',
  '--navbar-background'
] as const

const gradients = [
  '--gradient-brand',
  '--gradient-01',
  '--gradient-02',
  '--gradient-gamecard'
] as const

/* Primitives: the ramps from the `.color-primitive` collection in Figma. Every
   group uses the same scale, so a step means the same lightness in each ramp. */
const rampSteps = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950
] as const

const ramp = (group: string) =>
  rampSteps.map((step) => `--color-${group}-${step}`)

const primitiveRamps = [
  {
    name: 'brand',
    description:
      'The primary hue. Cyan, used for primary actions and the active accent.',
    tokens: ramp('brand')
  },
  {
    name: 'secondary',
    description:
      'The secondary hue. Purple, used for secondary actions and accents.',
    tokens: ramp('secondary')
  },
  {
    name: 'grey',
    description: 'Neutral surfaces, borders and text.',
    tokens: ramp('grey')
  },
  {
    name: 'success',
    description: 'Confirmation and healthy states.',
    tokens: ramp('success')
  },
  {
    name: 'warning',
    description: 'Caution and states that need attention.',
    tokens: ramp('warning')
  },
  {
    name: 'error',
    description: 'Failures and destructive actions.',
    tokens: ramp('error')
  }
] as const

const overlayPrimitives = [
  '--color-overlay-100',
  '--color-overlay-200',
  '--color-overlay-300'
] as const

const primitiveTokens = [
  ...primitiveRamps.flatMap(({ tokens }) => tokens),
  ...overlayPrimitives
] as const

const semanticTokens = [
  ...textTokens,
  ...backgroundTokens,
  ...iconTokens,
  ...borderTokens
] as const

const meta = {
  title: 'Foundations/Colors',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Colour comes in two layers. The semantic tokens — text, bg, icon and border, each split by role — are what components use. The primitives below them are the raw ramps a theme maps onto those roles. Every value here is read from the live stylesheet, so switching the theme in the toolbar updates them.'
      }
    }
  }
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

export const Text: Story = {
  render: () => (
    <Page>
      <Section
        title="text"
        description="Body copy is always neutral so it keeps its contrast on any theme. The roles below it are for the few words that carry a status."
      >
        <Swatches tokens={textTokens} />
      </Section>
    </Page>
  )
}

export const Background: Story = {
  render: () => (
    <Page>
      <Section
        title="bg"
        description="Solid fills for the role, and a subtle tint of the same hue for surfaces that sit behind text."
      >
        <Swatches tokens={backgroundTokens} />
      </Section>
      <Section title="surface" description="The theme's own layers.">
        <Swatches tokens={surfaceTokens} />
      </Section>
    </Page>
  )
}

export const IconAndBorder: Story = {
  name: 'Icon and border',
  render: () => (
    <Page>
      <Section title="icon">
        <Swatches tokens={iconTokens} />
      </Section>
      <Section title="border">
        <Swatches tokens={borderTokens} />
      </Section>
    </Page>
  )
}

export const Roles: Story = {
  render: () => (
    <Page>
      <Section
        title="Roles"
        description="The single source each semantic token derives from. A theme only has to point these six at its own palette."
      >
        <Swatches tokens={roleTokens} />
      </Section>
    </Page>
  )
}

export const Primitives: Story = {
  name: 'Color primitives',
  render: () => (
    <Page>
      <Section
        title="Color primitives"
        description="Every ramp runs from 50, the lightest, to 950, the darkest, so the same step means the same lightness in each group. These are the only place a color is written as a hex value; the role tokens and the components read from them."
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-lg-fixed)'
          }}
        >
          {primitiveRamps.map(({ name, tokens }) => (
            <Ramp key={name} name={name} tokens={tokens} />
          ))}
        </div>
      </Section>
      <Section
        title="opacity"
        description="Scrims built from the darkest grey of the ramp, at 80 %, 60 % and 40 %. Backdrops, image overlays and the card title gradient all come from these."
      >
        <Swatches tokens={overlayPrimitives} />
      </Section>
    </Page>
  )
}

export const LegacyTokens: Story = {
  name: 'Legacy tokens',
  render: () => (
    <Page>
      <Section
        title="Legacy primitives"
        description="The tokens the app used before the color primitives. They still resolve, but new work should use the ramps above or a semantic token."
      >
        <Swatches tokens={neutralPrimitives} />
      </Section>
      <Section title="brand">
        <Swatches tokens={brandPrimitives} />
      </Section>
      <Section title="accent">
        <Swatches tokens={accentPrimitives} />
      </Section>
      <Section title="success">
        <Swatches tokens={successPrimitives} />
      </Section>
      <Section title="warning">
        <Swatches tokens={warningPrimitives} />
      </Section>
      <Section title="destructive">
        <Swatches tokens={destructivePrimitives} />
      </Section>
      <Section title="info">
        <Swatches tokens={infoPrimitives} />
      </Section>
    </Page>
  )
}

export const Gradients: Story = {
  render: () => (
    <Page>
      <Section
        title="Gradients"
        description="Every gradient is a pair of ramp steps: --gradient-brand follows the theme's role colors for the primary button, while 01, 02 and the game card overlay run between the brand, secondary and opacity ramps."
      >
        <Swatches tokens={gradients} />
      </Section>
    </Page>
  )
}

function TokenProbe() {
  const values = useTokenValues(semanticTokens)

  return (
    <ul data-testid="token-probe">
      {semanticTokens.map((token) => (
        <li key={token} data-token={token}>
          {values[token] || ''}
        </li>
      ))}
    </ul>
  )
}

export const EverySemanticTokenResolves: Story = {
  tags: ['!autodocs'],
  render: () => <TokenProbe />,
  play: async ({ canvas }) => {
    const items = await canvas.findAllByRole('listitem')

    await expect(items).toHaveLength(semanticTokens.length)
    for (const item of items) {
      await expect(item).not.toBeEmptyDOMElement()
    }
  }
}

function PrimitiveProbe() {
  const values = useTokenValues(primitiveTokens)

  return (
    <ul data-testid="primitive-probe">
      {primitiveTokens.map((token) => (
        <li key={token} data-token={token}>
          {values[token] || ''}
        </li>
      ))}
    </ul>
  )
}

export const EveryPrimitiveTokenResolves: Story = {
  tags: ['!autodocs'],
  render: () => <PrimitiveProbe />,
  play: async ({ canvas }) => {
    const items = await canvas.findAllByRole('listitem')

    await expect(items).toHaveLength(primitiveTokens.length)
    for (const item of items) {
      await expect(item).not.toBeEmptyDOMElement()
    }
  }
}
