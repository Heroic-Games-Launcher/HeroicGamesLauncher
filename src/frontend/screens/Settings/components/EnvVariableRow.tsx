import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SvgButton, TextInputField } from 'frontend/components/UI'
import { EnviromentVariable } from 'common/types'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'

export const validateEnvKey = (
  key: string,
  t: (k: string, fallback: string) => string
): string => {
  const trimmedKey = key.trim()
  if (!trimmedKey) {
    return t(
      'options.env_variables.error.empty_key',
      "Variable names can't be empty"
    )
  }
  if (trimmedKey.match(/=/)) {
    return t(
      'options.env_variables.error.equal_sign_in_key',
      `Variable names can't contain the "=" sign`
    )
  }
  if (trimmedKey.match(/ /)) {
    return t(
      'options.env_variables.error.space_in_key',
      `Variable names can't contain spaces`
    )
  }
  return ''
}

interface Props {
  env: EnviromentVariable
  onSave: (newKey: string, newValue: string) => string | null
  onRemove: () => void
  onDuplicate: () => void
}

const EnvVariableRow = ({ env, onSave, onRemove, onDuplicate }: Props) => {
  const { t } = useTranslation()
  const [isEditing, setIsEditing] = useState(false)
  const [editKey, setEditKey] = useState(env.key)
  const [editValue, setEditValue] = useState(env.value)
  const [error, setError] = useState('')
  const rowRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (isEditing) {
      const input = rowRef.current?.querySelector<HTMLInputElement>(
        '.env-var-edit-fields input'
      )
      input?.focus()
    }
  }, [isEditing])

  const focusEditButton = () => {
    const btn = rowRef.current?.querySelector<HTMLButtonElement>(
      '.env-var-row-actions .svg-button'
    )
    btn?.focus()
  }

  const startEdit = () => {
    setEditKey(env.key)
    setEditValue(env.value)
    setError('')
    setIsEditing(true)
  }

  const cancelEdit = () => {
    setIsEditing(false)
    setError('')
    setTimeout(focusEditButton, 0)
  }

  const saveEdit = () => {
    const validationError = validateEnvKey(editKey, t)
    if (validationError) {
      setError(validationError)
      return
    }
    const saveError = onSave(editKey.trim(), editValue.trim())
    if (saveError) {
      setError(saveError)
      return
    }
    setIsEditing(false)
    setError('')
    setTimeout(focusEditButton, 0)
  }

  return (
    <div ref={rowRef} className="env-var-row">
      {isEditing ? (
        <div className="env-var-edit-fields">
          <TextInputField
            htmlId={`edit-key-${env.key}`}
            value={editKey}
            onChange={(val) => {
              let nextKey = val
              let nextValue = editValue
              if (val.includes('=') && !editValue) {
                const [key, ...rest] = val.split('=')
                nextKey = key
                nextValue = rest.join('=')
                setEditValue(nextValue)
              }
              setEditKey(nextKey)
              setError(validateEnvKey(nextKey, t))
            }}
            placeholder={t('options.advanced.placeHolderKey', 'NAME')}
          />
          <span className="env-var-connector">=</span>
          <TextInputField
            htmlId={`edit-value-${env.key}`}
            value={editValue}
            onChange={(val) => {
              setEditValue(val)
            }}
            placeholder={t('options.advanced.placeHolderV', 'VALUE')}
          />
        </div>
      ) : (
        <div className="env-var-info">
          <span className="env-var-key" title={env.key}>
            {env.key}
          </span>
          <span className="env-var-connector">=</span>
          <span className="env-var-value" title={env.value}>
            {env.value}
          </span>
        </div>
      )}

      {error && <div className="env-var-error">{error}</div>}

      <div className="env-var-row-actions">
        {isEditing ? (
          <>
            <SvgButton
              onClick={saveEdit}
              title={t('common.save', 'Save')}
              disabled={!editKey.trim()}
            >
              <CheckIcon style={{ color: 'var(--success)' }} fontSize="large" />
            </SvgButton>
            <SvgButton
              onClick={cancelEdit}
              title={t('common.cancel', 'Cancel')}
            >
              <CloseIcon style={{ color: 'var(--danger)' }} fontSize="large" />
            </SvgButton>
          </>
        ) : (
          <>
            <SvgButton onClick={startEdit} title={t('common.edit', 'Edit')}>
              <EditIcon
                style={{ color: 'var(--text-default)' }}
                fontSize="large"
              />
            </SvgButton>
            <SvgButton
              onClick={onDuplicate}
              title={t('common.duplicate', 'Duplicate')}
            >
              <ContentCopyIcon
                style={{ color: 'var(--text-default)' }}
                fontSize="large"
              />
            </SvgButton>
            <SvgButton onClick={onRemove} title={t('common.remove', 'Remove')}>
              <DeleteIcon style={{ color: 'var(--danger)' }} fontSize="large" />
            </SvgButton>
          </>
        )}
      </div>
    </div>
  )
}

export default EnvVariableRow
