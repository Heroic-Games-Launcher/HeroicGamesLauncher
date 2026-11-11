import { useEffect, useState } from 'react'
import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { defaultThemes } from 'frontend/components/UI/ThemeSelector'

import { Page, Section } from './TokenPreview'

const MINIMUM_RATIO = 4.5

const pairs = [
  ['--text-neutral', '--panel-base'],
  ['--text-neutral-muted', '--panel-base'],
  ['--text-neutral-faint', '--panel-base'],
  ['--text-brand', '--panel-base'],
  ['--text-accent', '--panel-base'],
  ['--text-success', '--panel-base'],
  ['--text-warning', '--panel-base'],
  ['--text-destructive', '--panel-base'],
  ['--text-destructive', '--bg-destructive-subtle@--panel-base'],
  ['--text-warning', '--bg-warning-subtle@--panel-base'],
  ['--text-success', '--bg-success-subtle@--panel-base'],
  ['--text-on-brand', '--bg-brand'],
  ['--on-nav', '--nav-base'],
  ['--on-nav-muted', '--nav-base']
] as const

type Row = { theme: string; fg: string; bg: string; ratio: number }

type Rgb = [number, number, number]

function createReader() {
  const context = document
    .createElement('canvas')
    .getContext('2d', { willReadFrequently: true })
  const probe = document.createElement('span')
  probe.style.cssText = 'position:fixed;width:0;height:0;opacity:0'
  document.body.appendChild(probe)

  const channels = (expression: string) => {
    probe.style.backgroundColor = ''
    probe.style.backgroundColor = expression
    const resolved = getComputedStyle(probe).backgroundColor
    if (!context) return [0, 0, 0, 1] as const
    context.clearRect(0, 0, 1, 1)
    context.fillStyle = resolved
    context.fillRect(0, 0, 1, 1)
    const data = context.getImageData(0, 0, 1, 1).data
    return [data[0], data[1], data[2], data[3] / 255] as const
  }

  return {
    channels,
    dispose: () => probe.remove()
  }
}

const flatten = (
  layer: readonly [number, number, number, number],
  base: Rgb
): Rgb => [
  layer[0] * layer[3] + base[0] * (1 - layer[3]),
  layer[1] * layer[3] + base[1] * (1 - layer[3]),
  layer[2] * layer[3] + base[2] * (1 - layer[3])
]

const luminance = ([r, g, b]: Rgb) => {
  const linear = (value: number) => {
    const c = value / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

const contrast = (a: Rgb, b: Rgb) => {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (lighter + 0.05) / (darker + 0.05)
}

function measure(themes: string[]): Row[] {
  const reader = createReader()
  const previous = document.body.className
  const rows: Row[] = []

  for (const theme of themes) {
    document.body.className = theme

    for (const [fgToken, bgToken] of pairs) {
      const [base, over] = bgToken.split('@')
      const background: Rgb = over
        ? flatten(
            reader.channels(`var(${base})`),
            reader.channels(`var(${over})`).slice(0, 3) as Rgb
          )
        : (reader.channels(`var(${base})`).slice(0, 3) as Rgb)

      const foreground = flatten(reader.channels(`var(${fgToken})`), background)

      rows.push({
        theme,
        fg: fgToken,
        bg: bgToken,
        ratio: Math.round(contrast(foreground, background) * 100) / 100
      })
    }
  }

  document.body.className = previous
  reader.dispose()
  return rows
}

const themeNames = Object.keys(defaultThemes)

function ContrastTable() {
  const [rows, setRows] = useState<Row[]>([])

  useEffect(() => setRows(measure(themeNames)), [])

  const worst = new Map<string, Row>()
  for (const row of rows) {
    const current = worst.get(row.theme)
    if (!current || row.ratio < current.ratio) worst.set(row.theme, row)
  }

  return (
    <table
      style={{
        borderCollapse: 'collapse',
        color: 'var(--on-panel)',
        fontFamily: 'var(--secondary-font-family)',
        fontSize: 'var(--body-sm)',
        width: '100%'
      }}
    >
      <thead>
        <tr>
          {['Theme', 'Worst pair', 'Ratio'].map((header) => (
            <th
              key={header}
              style={{
                borderBottom: '1px solid var(--panel-border)',
                padding: 'var(--space-xs-fixed)',
                textAlign: 'start'
              }}
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {[...worst.entries()].map(([theme, row]) => (
          <tr data-ratio={row.ratio} data-theme={theme} key={theme}>
            <td style={{ padding: 'var(--space-xs-fixed)' }}>
              {defaultThemes[theme]}
            </td>
            <td
              style={{
                color: 'var(--on-panel-muted)',
                padding: 'var(--space-xs-fixed)'
              }}
            >
              {row.fg} on {row.bg}
            </td>
            <td
              style={{
                color:
                  row.ratio >= MINIMUM_RATIO
                    ? 'var(--text-success)'
                    : 'var(--text-destructive)',
                fontWeight: 'var(--semibold)',
                padding: 'var(--space-xs-fixed)'
              }}
            >
              {row.ratio.toFixed(2)}:1
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const meta = {
  title: 'Foundations/Contrast',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Text tokens are derived from the surface they sit on, so contrast has to hold on every theme and not just the one running locally. This measures the worst text/background pair per theme against WCAG AA for body text.'
      }
    }
  }
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

export const WorstPairPerTheme: Story = {
  render: () => (
    <Page>
      <Section
        title="Worst contrast per theme"
        description={`Every pair has to clear ${MINIMUM_RATIO}:1.`}
      >
        <ContrastTable />
      </Section>
    </Page>
  )
}

export const EveryThemeClearsAA: Story = {
  tags: ['!autodocs'],
  render: () => <ContrastTable />,
  play: async ({ canvas }) => {
    const rows = await canvas.findAllByRole('row')
    const measured = rows.filter((row) => row.dataset.theme)

    await expect(measured).toHaveLength(themeNames.length)

    const failing = measured
      .filter((row) => Number(row.dataset.ratio) < MINIMUM_RATIO)
      .map((row) => `${row.dataset.theme}: ${row.dataset.ratio}:1`)

    await expect(failing).toEqual([])
  }
}
