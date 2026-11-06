import classNames from 'classnames'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'

import { Button } from 'frontend/components/UI'

import type { Runner } from 'common/types'

type PathAction = 'browse' | 'ignore' | 'skip' | 'download' | 'default-prefix'

export interface PathChoice {
  installAction: PathAction
  installOverride?: string
  prefixAction: PathAction
  prefixOverride?: string
}

export function runnerLabel(
  runner: Runner,
  t: TFunction<'translation'>
): string {
  switch (runner) {
    case 'legendary':
      return 'Epic Games'
    case 'gog':
      return 'GOG'
    case 'nile':
      return 'Amazon'
    case 'zoom':
      return 'ZOOM'
    default:
      return t('import-export.sideloaded', 'Sideloaded')
  }
}

export function StatusPill({
  status,
  children
}: {
  status: 'info' | 'warning' | 'missing'
  children: React.ReactNode
}) {
  return (
    <span className={classNames('ImportExportWizard__pill', `is-${status}`)}>
      {children}
    </span>
  )
}

export function PathActionRow({
  label,
  currentPath,
  action,
  override,
  actions,
  onAction
}: {
  label: string
  currentPath: string
  action: PathAction
  override?: string
  actions: PathAction[]
  onAction: (action: PathAction, path?: string) => void
}) {
  const { t } = useTranslation()

  async function pickPath() {
    const picked = await window.api.openDialog({
      properties: ['openDirectory'],
      title: label
    })
    if (typeof picked === 'string') {
      onAction('browse', picked)
    }
  }

  return (
    <div className="ImportExportWizard__pathRow">
      <div className="ImportExportWizard__pathLabel">{label}</div>
      <div className="ImportExportWizard__pathValue">
        <code>{override ?? currentPath}</code>
      </div>
      <div className="ImportExportWizard__pathActions">
        {actions.includes('browse') && (
          <Button
            variant={action === 'browse' ? 'primary' : 'secondary'}
            size="sm"
            onClick={pickPath}
          >
            {t('import-export.action.browse', 'Browse')}
          </Button>
        )}
        {actions.includes('ignore') && (
          <Button
            variant={action === 'ignore' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => onAction('ignore')}
          >
            {t('import-export.action.ignore', 'Keep')}
          </Button>
        )}
        {actions.includes('skip') && (
          <Button
            variant={action === 'skip' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => onAction('skip')}
          >
            {t('import-export.action.skip', 'Skip game')}
          </Button>
        )}
        {actions.includes('download') && (
          <Button
            variant={action === 'download' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => onAction('download')}
          >
            {t('import-export.action.download', 'Download missing')}
          </Button>
        )}
        {actions.includes('default-prefix') && (
          <Button
            variant={action === 'default-prefix' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => onAction('default-prefix')}
          >
            {t('import-export.action.defaultPrefix', 'Use default prefix')}
          </Button>
        )}
      </div>
    </div>
  )
}
