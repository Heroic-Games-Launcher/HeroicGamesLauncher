import './mocks/electronApi'

import { ReactNode, useContext, useEffect } from 'react'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import type { Decorator, Preview } from '@storybook/react-vite'

import ContextProvider from 'frontend/state/ContextProvider'
import { defaultThemes } from 'frontend/components/UI/ThemeSelector'

import i18n from './i18n'

import 'frontend/index.scss'
import 'frontend/themes.scss'
import 'frontend/App.css'
import './preview.css'

const muiTheme = (isRTL: boolean) =>
  createTheme({
    direction: isRTL ? 'rtl' : 'ltr',
    typography: {
      fontFamily: 'var(--primary-font-family)'
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            color: 'var(--text-default)',
            backgroundColor: 'var(--background)'
          }
        }
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            fontSize: 'var(--body-md)',
            backgroundColor: 'var(--background-darker)',
            color: 'var(--text-default)',
            padding: 'var(--space-md)',
            borderRadius: 'var(--space-sm)',
            maxWidth: '350px'
          }
        }
      }
    }
  })

function ThemedBody({
  themeClass,
  children
}: {
  themeClass: string
  children: ReactNode
}) {
  useEffect(() => {
    document.body.className = themeClass
  }, [themeClass])

  return <>{children}</>
}

function AppShell({
  isRTL,
  children
}: {
  isRTL: boolean
  children: ReactNode
}) {
  const appContext = useContext(ContextProvider)

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr'
  }, [isRTL])

  return (
    <ContextProvider.Provider value={{ ...appContext, isRTL }}>
      <ThemeProvider theme={muiTheme(isRTL)}>
        <div className={isRTL ? 'isRTL' : undefined}>{children}</div>
      </ThemeProvider>
    </ContextProvider.Provider>
  )
}

const withHeroicTheme: Decorator = (Story, { globals }) => (
  <ThemedBody themeClass={String(globals.theme ?? 'midnightMirage')}>
    <Story />
  </ThemedBody>
)

const withAppShell: Decorator = (Story, { globals }) => (
  <AppShell isRTL={globals.direction === 'rtl'}>
    <Story />
  </AppShell>
)

const withI18n: Decorator = (Story) => (
  <I18nextProvider i18n={i18n}>
    <Story />
  </I18nextProvider>
)

const withRouter: Decorator = (Story) => (
  <MemoryRouter initialEntries={['/']}>
    <Story />
  </MemoryRouter>
)

const preview: Preview = {
  decorators: [withHeroicTheme, withAppShell, withI18n, withRouter],
  initialGlobals: {
    theme: 'midnightMirage',
    direction: 'ltr'
  },
  globalTypes: {
    theme: {
      description: 'Heroic theme applied to the preview body',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        dynamicTitle: true,
        items: Object.entries(defaultThemes).map(([value, title]) => ({
          value,
          title
        }))
      }
    },
    direction: {
      description: 'Writing direction',
      toolbar: {
        title: 'Direction',
        icon: 'transfer',
        dynamicTitle: true,
        items: [
          { value: 'ltr', title: 'LTR' },
          { value: 'rtl', title: 'RTL' }
        ]
      }
    }
  },
  parameters: {
    backgrounds: { disable: true },
    a11y: { test: 'todo' },
    controls: { expanded: true },
    docs: { codePanel: true },
    options: {
      storySort: {
        order: [
          'Foundations',
          ['Colors', 'Typography', 'Spacing', 'Radius'],
          'Atoms',
          'Forms',
          'Feedback',
          'Data Display',
          'Navigation',
          'Overlays',
          'Patterns'
        ]
      }
    }
  },
  tags: ['autodocs']
}

export default preview
