import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EnviromentVariable } from 'common/types'
import { validateEnvKey } from './EnvVariableRow'

interface BulkEditModalProps {
  initialEnvs: EnviromentVariable[]
  onSave: (envs: EnviromentVariable[]) => void
  onCancel: () => void
}

const BulkEditModal = ({
  initialEnvs,
  onSave,
  onCancel
}: BulkEditModalProps) => {
  const { t } = useTranslation()
  const initialText = useMemo(
    () => initialEnvs.map((env) => `${env.key}=${env.value}`).join('\n'),
    [initialEnvs]
  )
  const [currentText, setCurrentText] = useState(initialText)
  const [error, setError] = useState('')

  const handleSave = () => {
    const lines = currentText.split('\n')
    const envMap = new Map<string, string>()

    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine) continue

      if (!trimmedLine.includes('=')) {
        setError(
          t(
            'options.env_variables.bulk_edit_error',
            'Some variables are incorrect. Please check that all lines follow the KEY=VALUE format.'
          )
        )
        return
      }

      const [key, ...rest] = trimmedLine.split('=')
      const trimmedKey = key.trim()
      const trimmedVal = rest.join('=').trim()

      const keyError = validateEnvKey(trimmedKey, t)
      if (keyError) {
        setError(keyError)
        return
      }

      envMap.set(trimmedKey, trimmedVal)
    }

    const newEnvs: EnviromentVariable[] = Array.from(envMap).map(
      ([key, value]) => ({ key, value })
    )
    onSave(newEnvs)
  }

  return (
    <div className="bulk-edit-wrapper">
      <textarea
        className="bulk-edit-textarea"
        defaultValue={initialText}
        onChange={(e) => {
          setCurrentText(e.target.value)
          setError('')
        }}
        placeholder="KEY=VALUE"
      />
      {error && <div className="env-var-error">{error}</div>}
      <div className="bulk-edit-actions">
        <button onClick={onCancel} className="button is-secondary">
          {t('common.cancel', 'Cancel')}
        </button>
        <button onClick={handleSave} className="button is-primary">
          {t('common.save', 'Save')}
        </button>
      </div>
    </div>
  )
}

export default BulkEditModal
