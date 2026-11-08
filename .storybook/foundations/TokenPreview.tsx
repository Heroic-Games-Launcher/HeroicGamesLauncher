import { CSSProperties, ReactNode, useEffect, useState } from 'react'

export interface TokenGroup {
  name: string
  description?: string
  tokens: readonly string[]
}

const channel = (n: number) => Math.round(n).toString(16).padStart(2, '0')

function toHex(canvas: CanvasRenderingContext2D | null, value: string) {
  if (!canvas) return value

  canvas.clearRect(0, 0, 1, 1)
  canvas.fillStyle = '#000000'
  canvas.fillStyle = value
  if (canvas.fillStyle === '#000000' && !/^(#000000|black)$/i.test(value)) {
    return value
  }
  canvas.fillRect(0, 0, 1, 1)

  const [r, g, b, a] = canvas.getImageData(0, 0, 1, 1).data

  return a === 255
    ? `#${channel(r)}${channel(g)}${channel(b)}`
    : `#${channel(r)}${channel(g)}${channel(b)}${channel(a)}`
}

function resolve(
  probe: HTMLElement,
  canvas: CanvasRenderingContext2D | null,
  token: string,
  raw: string
) {
  probe.style.backgroundImage = ''
  probe.style.backgroundColor = ''
  probe.style.backgroundColor = `var(${token})`

  const color = getComputedStyle(probe).backgroundColor
  if (color && color !== 'rgba(0, 0, 0, 0)') return toHex(canvas, color)

  probe.style.backgroundColor = ''
  probe.style.backgroundImage = `var(${token})`
  const image = getComputedStyle(probe).backgroundImage
  if (image && image !== 'none') return image

  return raw || 'transparent'
}

export function useTokenValues(tokens: readonly string[]) {
  const [values, setValues] = useState<Record<string, string>>({})

  useEffect(() => {
    const probe = document.createElement('span')
    probe.style.position = 'fixed'
    probe.style.inlineSize = '0'
    probe.style.blockSize = '0'
    probe.style.opacity = '0'
    probe.style.pointerEvents = 'none'
    document.body.appendChild(probe)

    const canvas = document
      .createElement('canvas')
      .getContext('2d', { willReadFrequently: true })

    const read = () => {
      const styles = getComputedStyle(document.body)
      setValues(
        Object.fromEntries(
          tokens.map((token) => [
            token,
            resolve(probe, canvas, token, styles.getPropertyValue(token).trim())
          ])
        )
      )
    }

    read()
    const observer = new MutationObserver(read)
    observer.observe(document.body, { attributeFilter: ['class'] })
    return () => {
      observer.disconnect()
      probe.remove()
    }
  }, [tokens])

  return values
}

const sectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-md-fixed)',
  marginBottom: 'var(--space-3xl-fixed)'
}

const headingStyle: CSSProperties = {
  color: 'var(--on-panel)',
  fontSize: 'var(--title-sm)',
  fontWeight: 'var(--semibold)'
}

const captionStyle: CSSProperties = {
  color: 'var(--on-panel-muted)',
  fontSize: 'var(--body-sm)',
  margin: 0
}

const nameStyle: CSSProperties = {
  fontFamily: 'var(--secondary-font-family)',
  fontSize: 'var(--text-sm)',
  fontWeight: 'var(--medium)',
  letterSpacing: '0.01em'
}

const valueStyle: CSSProperties = {
  ...nameStyle,
  color: 'var(--on-panel-muted)',
  fontWeight: 'var(--regular)'
}

export function Section({
  title,
  description,
  children
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section style={sectionStyle}>
      <div>
        <h2 style={headingStyle}>{title}</h2>
        {description && <p style={captionStyle}>{description}</p>}
      </div>
      {children}
    </section>
  )
}

export function Page({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        color: 'var(--on-panel)',
        fontFamily: 'var(--secondary-font-family)',
        maxWidth: '72rem'
      }}
    >
      {children}
    </div>
  )
}

export function Swatches({ tokens }: { tokens: readonly string[] }) {
  const values = useTokenValues(tokens)

  return (
    <div
      style={{
        display: 'grid',
        gap: 'var(--space-sm-fixed)',
        gridTemplateColumns: 'repeat(auto-fill, minmax(13rem, 1fr))'
      }}
    >
      {tokens.map((token) => (
        <div
          key={token}
          style={{
            background: 'var(--panel-surface)',
            border: '1px solid var(--panel-border)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              background: `var(${token})`,
              height: '4rem',
              borderBottom: '1px solid var(--panel-border)'
            }}
          />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3xs-fixed)',
              padding: 'var(--space-xs-fixed) var(--space-sm-fixed)'
            }}
          >
            <span style={nameStyle}>{token}</span>
            <span style={{ ...valueStyle, overflowWrap: 'anywhere' }}>
              {values[token] || '—'}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

export function TokenTable({
  tokens,
  preview
}: {
  tokens: readonly string[]
  preview: (token: string, value: string) => ReactNode
}) {
  const values = useTokenValues(tokens)

  return (
    <div
      style={{
        border: '1px solid var(--panel-border)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden'
      }}
    >
      {tokens.map((token, index) => (
        <div
          key={token}
          style={{
            alignItems: 'center',
            background: index % 2 ? 'transparent' : 'var(--panel-background)',
            display: 'grid',
            gap: 'var(--space-md-fixed)',
            gridTemplateColumns: 'minmax(10rem, 14rem) 5rem 1fr',
            padding: 'var(--space-xs-fixed) var(--space-md-fixed)'
          }}
        >
          <span style={nameStyle}>{token}</span>
          <span style={valueStyle}>{values[token] || '—'}</span>
          <div>{preview(token, values[token] ?? '')}</div>
        </div>
      ))}
    </div>
  )
}
