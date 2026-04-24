import classNames from 'classnames'
import { useTranslation } from 'react-i18next'

import type { HeroicBackupStageId } from 'common/types/importExport'
import type { Runner } from 'common/types'

import { STAGE_LABELS } from './labels'

export type PathAction =
  | 'browse'
  | 'ignore'
  | 'skip'
  | 'download'
  | 'default-prefix'

export interface PathChoice {
  installAction: PathAction
  installOverride?: string
  prefixAction: PathAction
  prefixOverride?: string
}

export function runnerLabel(runner: Runner): string {
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
      return 'Sideloaded'
  }
}

export function stageFriendlyLabel(stage: HeroicBackupStageId): string {
  return STAGE_LABELS[stage]
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
          <button
            type="button"
            className={classNames('button is-tertiary', {
              'is-selected': action === 'browse'
            })}
            onClick={pickPath}
          >
            {t('import-export.action.browse', 'Browse')}
          </button>
        )}
        {actions.includes('ignore') && (
          <button
            type="button"
            className={classNames('button is-tertiary', {
              'is-selected': action === 'ignore'
            })}
            onClick={() => onAction('ignore')}
          >
            {t('import-export.action.ignore', 'Keep')}
          </button>
        )}
        {actions.includes('skip') && (
          <button
            type="button"
            className={classNames('button is-tertiary', {
              'is-selected': action === 'skip'
            })}
            onClick={() => onAction('skip')}
          >
            {t('import-export.action.skip', 'Skip game')}
          </button>
        )}
        {actions.includes('download') && (
          <button
            type="button"
            className={classNames('button is-tertiary', {
              'is-selected': action === 'download'
            })}
            onClick={() => onAction('download')}
          >
            {t('import-export.action.download', 'Download missing')}
          </button>
        )}
        {actions.includes('default-prefix') && (
          <button
            type="button"
            className={classNames('button is-tertiary', {
              'is-selected': action === 'default-prefix'
            })}
            onClick={() => onAction('default-prefix')}
          >
            {t('import-export.action.defaultPrefix', 'Use default prefix')}
          </button>
        )}
      </div>
    </div>
  )
}
