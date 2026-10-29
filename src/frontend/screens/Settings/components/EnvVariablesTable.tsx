import { useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Button,
  Icon,
  InfoTooltip,
  TextInputField
} from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'
import { Eraser, ListChecks, Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader
} from 'frontend/components/UI/Dialog'
import './EnvVariablesTable.css'

import BulkEditModal from './BulkEditModal'
import EnvVariableRow, { validateEnvKey } from './EnvVariableRow'

const EnvVariablesTable = () => {
  const { t } = useTranslation()
  const { showDialogModal } = useContext(ContextProvider)
  const [environmentOptions, setEnvironmentOptions] = useSetting(
    'enviromentOptions',
    []
  )

  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [formError, setFormError] = useState('')
  const [showBulkEdit, setShowBulkEdit] = useState(false)

  const handleAdd = () => {
    const error = validateEnvKey(newKey, t)
    if (error) {
      setFormError(error)
      return
    }

    const trimmedKey = newKey.trim()
    const trimmedValue = newValue.trim()

    if (environmentOptions.some((env) => env.key === trimmedKey)) {
      setFormError(
        t(
          'options.env_variables.error.duplicate_key',
          'A variable with this name already exists'
        )
      )
      return
    }

    setEnvironmentOptions([
      ...environmentOptions,
      { key: trimmedKey, value: trimmedValue }
    ])
    setNewKey('')
    setNewValue('')
    setFormError('')
  }

  const handleRemove = (index: number) => {
    setEnvironmentOptions(environmentOptions.filter((_, i) => i !== index))
  }

  const generateUniqueCopyKey = (baseKey: string): string => {
    const existingKeys = new Set(environmentOptions.map((env) => env.key))
    const baseCopyKey = `${baseKey}_COPY`
    if (!existingKeys.has(baseCopyKey)) return baseCopyKey

    let counter = 2
    while (existingKeys.has(`${baseKey}_COPY${counter}`)) {
      counter += 1
    }
    return `${baseKey}_COPY${counter}`
  }

  const handleDuplicate = (index: number) => {
    const item = environmentOptions[index]
    const newCopyKey = generateUniqueCopyKey(item.key)
    setEnvironmentOptions([
      ...environmentOptions,
      { key: newCopyKey, value: item.value }
    ])
  }

  const handleSaveEdit = (
    index: number,
    newKey: string,
    newValue: string
  ): string | null => {
    const duplicateIndex = environmentOptions.findIndex(
      (env, i) => i !== index && env.key === newKey
    )
    if (duplicateIndex >= 0) {
      return t(
        'options.env_variables.error.duplicate_key',
        'A variable with this name already exists'
      )
    }
    const updated = [...environmentOptions]
    updated[index] = { key: newKey, value: newValue }
    setEnvironmentOptions(updated)
    return null
  }

  const handleClearAll = () => {
    showDialogModal({
      title: t('common.warning', 'Warning'),
      message: t(
        'options.env_variables.clear_all_confirm',
        'Are you sure you want to clear all environment variables?'
      ),
      buttons: [
        {
          text: t('common.cancel', 'Cancel'),
          onClick: () => {}
        },
        {
          text: t('common.confirm', 'Confirm'),
          onClick: () => setEnvironmentOptions([])
        }
      ]
    })
  }

  const envVariablesInfo = (
    <>
      {t(
        'options.env_variables.info',
        'Set environment variables to append to the command.'
      )}
      <br />
      {t(
        'options.env_variables.example',
        'Do NOT include the "=" sign, e.g: for a setting like "MY_FLAG=123", set MY_FLAG in NAME and 123 in VALUE.'
      )}
    </>
  )

  return (
    <div className="env-vars-container">
      {showBulkEdit && (
        <Dialog showCloseButton onClose={() => setShowBulkEdit(false)}>
          <DialogHeader onClose={() => setShowBulkEdit(false)}>
            {t('options.env_variables.bulk_edit', 'Bulk Edit')}
          </DialogHeader>
          <DialogContent>
            <BulkEditModal
              initialEnvs={environmentOptions}
              onCancel={() => setShowBulkEdit(false)}
              onSave={(envs) => {
                setEnvironmentOptions(envs)
                setShowBulkEdit(false)
              }}
            />
          </DialogContent>
        </Dialog>
      )}
      <div className="env-vars-header">
        <span className="env-vars-title">
          {t('options.advanced.title', 'Environment Variables')}
          <InfoTooltip
            content={envVariablesInfo}
            label={t('options.advanced.title', 'Environment Variables')}
          />
        </span>
        <div className="env-vars-actions">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowBulkEdit(true)}
            title={t('options.env_variables.bulk_edit', 'Bulk Edit')}
            icon={<Icon glyph={ListChecks} size="md" />}
          />
          <Button
            variant="ghost"
            size="sm"
            className="env-vars-clear"
            onClick={handleClearAll}
            title={t('common.clear_all', 'Clear All')}
            disabled={environmentOptions.length === 0}
            icon={<Icon glyph={Eraser} size="md" />}
          />
        </div>
      </div>

      <div className="env-vars-list">
        {environmentOptions.map((env, index) => (
          <EnvVariableRow
            key={env.key}
            env={env}
            onSave={(newKey, newValue) =>
              handleSaveEdit(index, newKey, newValue)
            }
            onRemove={() => handleRemove(index)}
            onDuplicate={() => handleDuplicate(index)}
          />
        ))}
      </div>

      <div className="env-var-add-section">
        <span className="env-var-add-title">
          {t('options.env_variables.add_new', 'Add New Variable')}
        </span>
        <div className="env-var-add-inputs">
          <TextInputField
            htmlId="new-env-key"
            value={newKey}
            onChange={(val) => {
              let nextKey = val
              let nextValue = newValue
              if (val.includes('=') && !newValue) {
                const [key, ...rest] = val.split('=')
                nextKey = key
                nextValue = rest.join('=')
                setNewValue(nextValue)
              }
              setNewKey(nextKey)
              setFormError(validateEnvKey(nextKey, t))
            }}
            placeholder={t('options.advanced.placeHolderKey', 'NAME')}
            aria-label={t('options.advanced.key', 'Variable Name')}
          />
          <span className="env-var-connector">=</span>
          <TextInputField
            htmlId="new-env-value"
            value={newValue}
            onChange={(val) => {
              setNewValue(val)
            }}
            placeholder={t('options.advanced.placeHolderV', 'VALUE')}
            aria-label={t('options.advanced.value', 'Value')}
          />
          <Button
            variant="ghost"
            onClick={handleAdd}
            disabled={!newKey.trim()}
            title={t('common.add', 'Add')}
            icon={<Icon glyph={Plus} size="lg" strokeWidth={2.25} />}
          />
        </div>
        {formError && <div className="env-var-error">{formError}</div>}
      </div>
    </div>
  )
}

export default EnvVariablesTable
