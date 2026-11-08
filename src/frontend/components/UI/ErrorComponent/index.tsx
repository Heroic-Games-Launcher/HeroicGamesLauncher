import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { Brush, HeartCrack, RefreshCw, Trash2 } from 'lucide-react'

import './index.css'
import ContextProvider from 'frontend/state/ContextProvider'
import Button from '../Button'
import EmptyState from '../EmptyState'
import Icon from '../Icon'
import Panel from '../Panel'

export default function ErrorComponent({ message }: { message: string }) {
  const { t } = useTranslation()
  const { refreshLibrary, showResetDialog } = useContext(ContextProvider)

  return (
    <div className="errorComponent">
      <Panel className="errorComponent__panel" padding="lg" tone="solid">
        <EmptyState
          action={
            <div className="errorComponent__actions">
              <Button
                fullWidth
                icon={<Icon glyph={RefreshCw} size="sm" />}
                onClick={async () =>
                  refreshLibrary({
                    checkForUpdates: true,
                    runInBackground: false
                  })
                }
              >
                {t('generic.library.refresh', 'Refresh Library')}
              </Button>
              <Button
                fullWidth
                icon={<Icon glyph={Brush} size="sm" />}
                onClick={() => window.api.clearCache(true)}
                variant="ghost"
              >
                {t('settings.clear-cache', 'Clear Heroic Cache')}
              </Button>
              <Button
                fullWidth
                icon={<Icon glyph={Trash2} size="sm" />}
                onClick={showResetDialog}
                variant="danger"
              >
                {t('settings.reset-heroic', 'Reset Heroic')}
              </Button>
            </div>
          }
          description={t(
            'error.recovery',
            'Refreshing the library usually fixes it. Clearing the cache or resetting Heroic are the next steps if it does not.'
          )}
          glyph={HeartCrack}
          title={message}
        />
      </Panel>
    </div>
  )
}
