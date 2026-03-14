import { useState } from 'react'
import { EnviromentVariable } from 'common/types'

interface BulkEditModalProps {
  initialValue: string
  onSave: (envs: EnviromentVariable[]) => void
  onCancel: () => void
  t: (key: string, fallback?: string) => string
}

const BulkEditModal = ({
  initialValue,
  onSave,
  onCancel,
  t
}: BulkEditModalProps) => {
  const [currentText, setCurrentText] = useState(initialValue)
  const [error, setError] = useState('')

  const handleSave = () => {
    const lines = currentText.split('\n')
    const envMap = new Map<string, string>()
    let hasError = false

    lines.forEach((line) => {
      const trimmedLine = line.trim()
      if (!trimmedLine) return

      if (trimmedLine.includes('=')) {
        const [key, ...rest] = trimmedLine.split('=')
        const trimmedKey = key.trim()
        const trimmedVal = rest.join('=').trim()

        if (!trimmedKey || !trimmedVal) {
          hasError = true
        } else {
          envMap.set(trimmedKey, trimmedVal)
        }
      } else {
        hasError = true
      }
    })

    if (hasError) {
      setError(
        t(
          'options.env_variables.bulk_edit_error',
          'Some variables are incorrect. Please check that all lines follow the KEY=VALUE format and neither is empty.'
        )
      )
      return
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
        defaultValue={initialValue}
        onChange={(e) => {
          setCurrentText(e.target.value)
          setError('')
        }}
        placeholder="KEY=VALUE"
      />
      {error && (
        <div className="env-var-error" style={{ marginTop: '10px' }}>
          {error}
        </div>
      )}
      <div className="bulk-edit-actions">
        <button
          className="SvgButton"
          onClick={onCancel}
          style={{
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            background: 'var(--background-darker)',
            color: 'var(--text-color)',
            border: 'none'
          }}
        >
          {t('common.cancel', 'Cancel')}
        </button>
        <button
          className="SvgButton"
          onClick={handleSave}
          style={{
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            background: 'var(--accent)',
            color: 'white',
            border: 'none'
          }}
        >
          {t('common.save', 'Save')}
        </button>
      </div>
    </div>
  )
}

export default BulkEditModal
