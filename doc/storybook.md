# Storybook

Storybook is where the frontend's shared UI lives in isolation. It is the place to
build a new component, review an existing one against every theme, and read what a
component's props actually do.

```bash
pnpm storybook        # dev server on http://localhost:6006
pnpm build-storybook  # static build into storybook-static/
pnpm test:storybook   # run every story as a test
```

## What is in there

- **Foundations** — the design tokens from `src/frontend/styles`: colours,
  typography, spacing and radius. The values are read from the live stylesheet,
  so they always match the code rather than a copy of it.
- **Atoms, Forms, Feedback, Data Display, Navigation, Overlays** — the components
  under `src/frontend/components/UI`.
- **Patterns** — the composed pieces that depend on app state, like the library
  header and the sidebar.

## Toolbar

Two globals sit in the toolbar:

- **Theme** switches the class on `<body>`, exactly like the app does. Use it to
  check a component against light themes such as Nord Light, not only the default
  Midnight Mirage.
- **Direction** flips the preview to RTL and sets `isRTL` on the app context.

## Writing a story

Stories live next to the component they document, as `index.stories.tsx`. The
`title` decides where the story shows up in the sidebar.

```tsx
import { expect, fn } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import Badge from '.'

const meta = {
  title: 'Atoms/Badge',
  component: Badge,
  args: { children: 'Installed' }
} satisfies Meta<typeof Badge>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
```

A few things are already wired up by `.storybook/preview.tsx`, so stories do not
need to set them up again:

- the global stylesheets and every theme
- i18next, loaded with the English files from `public/locales`
- the MUI theme used by the app
- a `MemoryRouter`, so components with `NavLink` just work
- `ContextProvider` falls back to its default value, which is enough for most
  components. Wrap the story in your own provider when you need to force a value

`window.api` is replaced by a stub in `.storybook/mocks/electronApi.ts`. Unknown
calls resolve to `undefined`, and `handle*`/`on*` listeners return a no-op
unsubscribe. To return something specific, assign it for the length of a story:

```tsx
beforeEach: () => {
  window.api.getCustomThemes = () => Promise.resolve(['neon.css'])
  return () => {
    delete (window.api as Partial<typeof window.api>).getCustomThemes
  }
}
```

Deleting the key restores the default stub.

## Tests

`pnpm test:storybook` runs the stories in headless Chromium through Vitest. Every
story is rendered, and a story with a `play` function also runs its interactions
and assertions. That makes a story the natural place to write a component test:

```tsx
export const TogglesPressedState: Story = {
  play: async ({ canvas, userEvent }) => {
    const chip = canvas.getByRole('button', { name: 'Installed only' })

    await expect(chip).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(chip)
    await expect(chip).toHaveAttribute('aria-pressed', 'true')
  }
}
```

Prefer accessible queries (`getByRole`, `getByLabelText`) over class names: a test
written that way fails when the component stops being usable with a keyboard or a
screen reader, which is the thing worth protecting.

Components rendered in a portal — MUI dialogs, selects and tooltips — are outside
the story canvas. Query those through `screen` instead of `canvas`.

Stories tagged `!autodocs` are excluded from the generated docs page. Use that for
the assertion-only stories that have nothing to show.

The accessibility addon reports violations in the a11y panel without failing the
run. The browser cannot tell you whether a theme clears WCAG contrast on its own,
so check the themes that matter with the toolbar.

## Backend tests

This file only covers the frontend. The backend keeps its own Jest suite, run with
`pnpm test`.
