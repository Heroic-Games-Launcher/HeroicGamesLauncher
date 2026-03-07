import { useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { InfoBox, TextInputField, SvgButton } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import SaveIcon from '@mui/icons-material/Save'
import ClearAllIcon from '@mui/icons-material/ClearAll'
import ListAltIcon from '@mui/icons-material/ListAlt'
import CloseIcon from '@mui/icons-material/Close'
import AddBoxIcon from '@mui/icons-material/AddBox'
import './EnvVariablesTable.css'

import BulkEditModal from './BulkEditModal'

const EnvVariablesTable = () => {
  const { t } = useTranslation()
  const { showDialogModal } = useContext(ContextProvider)
  const [environmentOptions, setEnvironmentOptions] = useSetting(
    'enviromentOptions',
    []
  )

  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editKey, setEditKey] = useState('')
  const [editValue, setEditValue] = useState('')
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [formError, setFormError] = useState('')

  const validateEnv = (key: string, value: string): string => {
    const trimmedKey = key.trim()
    const trimmedValue = value.trim()

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
    if (!trimmedValue) {
      return t(
        'options.env_variables.error.empty_value',
        "Value can't be empty"
      )
    }
    return ''
  }

  const handleAdd = () => {
    const error = validateEnv(newKey, newValue)
    if (error) {
      setFormError(error)
      return
    }

    const trimmedKey = newKey.trim()
    const trimmedValue = newValue.trim()

    // Overwrite if exists
    const existingIndex = environmentOptions.findIndex(
      (env) => env.key === trimmedKey
    )

    const updated = [...environmentOptions]
    if (existingIndex >= 0) {
      updated[existingIndex] = { key: trimmedKey, value: trimmedValue }
    } else {
      updated.push({ key: trimmedKey, value: trimmedValue })
    }

    setEnvironmentOptions(updated)
    setNewKey('')
    setNewValue('')
    setFormError('')
  }

  const handleRemove = (index: number) => {
    const updated = environmentOptions.filter((_, i) => i !== index)
    setEnvironmentOptions(updated)
  }

  const handleDuplicate = (index: number) => {
    const item = environmentOptions[index]
    const updated = [
      ...environmentOptions,
      { key: `${item.key}_COPY`, value: item.value }
    ]
    setEnvironmentOptions(updated)
  }

  const handleEdit = (index: number) => {
    setEditingIndex(index)
    setEditKey(environmentOptions[index].key)
    setEditValue(environmentOptions[index].value)
    setFormError('')
  }

  const handleSaveEdit = (index: number) => {
    const error = validateEnv(editKey, editValue)
    if (error) {
      setFormError(error)
      return
    }
    const updated = [...environmentOptions]
    updated[index] = { key: editKey.trim(), value: editValue.trim() }
    setEnvironmentOptions(updated)
    setEditingIndex(null)
    setFormError('')
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

  const openBulkEdit = () => {
    const bulkText = environmentOptions
      .map((env) => `${env.key}=${env.value}`)
      .join('\n')

    showDialogModal({
      title: t('options.env_variables.bulk_edit', 'Bulk Edit'),
      message: (
        <BulkEditModal
          initialValue={bulkText}
          t={t}
          onCancel={() => showDialogModal({ showDialog: false })}
          onSave={(envs) => {
            setEnvironmentOptions(envs)
            showDialogModal({ showDialog: false })
          }}
        />
      ),
      buttons: []
    })
  }

  const envVariablesInfo = (
    <InfoBox text="infobox.help">
      {t(
        'options.env_variables.info',
        'Set environment variables to append to the command.'
      )}
      <br />
      {t(
        'options.env_variables.example',
        'Do NOT include the "=" sign, e.g: for a setting like "MY_FLAG=123", set MY_FLAG in NAME and 123 in VALUE.'
      )}
    </InfoBox>
  )

  return (
    <div className="env-vars-container">
      <div className="env-vars-header">
        <h3 className="env-vars-title">
          {t('options.advanced.title', 'Environment Variables')}
        </h3>
        <div className="env-vars-actions">
          <SvgButton
            onClick={openBulkEdit}
            title={t('options.env_variables.bulk_edit', 'Bulk Edit')}
          >
            <ListAltIcon style={{ color: 'var(--accent)' }} fontSize="large" />
          </SvgButton>
          <SvgButton
            onClick={handleClearAll}
            title={t('common.clear_all', 'Clear All')}
          >
            <ClearAllIcon style={{ color: 'var(--danger)' }} fontSize="large" />
          </SvgButton>
        </div>
      </div>

      <div className="env-vars-list">
        {environmentOptions.map((env) => {
          const index = environmentOptions.findIndex((e) => e === env)
          const isEditing = editingIndex === index

          return (
            <div key={`${env.key}-${index}`} className="env-var-row">
              {isEditing ? (
                <div className="env-var-edit-fields">
                  <TextInputField
                    htmlId={`edit-key-${index}`}
                    value={editKey}
                    onChange={(val) => {
                      if (val.includes('=') && !editValue) {
                        const [key, ...rest] = val.split('=')
                        setEditKey(key)
                        setEditValue(rest.join('='))
                      } else {
                        setEditKey(val)
                      }
                      setFormError(validateEnv(val, editValue))
                    }}
                    placeholder="NAME"
                    extraClass={
                      formError && editingIndex === index ? 'error' : ''
                    }
                  />
                  <span className="env-var-connector">=</span>
                  <TextInputField
                    htmlId={`edit-value-${index}`}
                    value={editValue}
                    onChange={(val) => {
                      setEditValue(val)
                      setFormError(validateEnv(editKey, val))
                    }}
                    placeholder="VALUE"
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

              <div className="env-var-row-actions">
                {isEditing ? (
                  <>
                    <SvgButton
                      onClick={() => handleSaveEdit(index)}
                      disabled={!editKey.trim() || !editValue.trim()}
                    >
                      <SaveIcon
                        style={{ color: 'var(--success)' }}
                        fontSize="large"
                      />
                    </SvgButton>
                    <SvgButton
                      onClick={() => {
                        setEditingIndex(null)
                        setFormError('')
                      }}
                    >
                      <CloseIcon
                        style={{ color: 'var(--danger)' }}
                        fontSize="large"
                      />
                    </SvgButton>
                  </>
                ) : (
                  <>
                    <SvgButton onClick={() => handleEdit(index)}>
                      <EditIcon
                        style={{ color: 'var(--accent)' }}
                        fontSize="large"
                      />
                    </SvgButton>
                    <SvgButton onClick={() => handleDuplicate(index)}>
                      <ContentCopyIcon
                        style={{ color: 'var(--accent)' }}
                        fontSize="large"
                      />
                    </SvgButton>
                    <SvgButton onClick={() => handleRemove(index)}>
                      <DeleteIcon
                        style={{ color: 'var(--danger)' }}
                        fontSize="large"
                      />
                    </SvgButton>
                  </>
                )}
              </div>
            </div>
          )
        })}
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
              if (val.includes('=') && !newValue) {
                const [key, ...rest] = val.split('=')
                setNewKey(key)
                setNewValue(rest.join('='))
                setFormError(validateEnv(key, rest.join('=')))
              } else {
                setNewKey(val)
                setFormError(validateEnv(val, newValue))
              }
            }}
            placeholder={t('options.advanced.placeHolderKey', 'NAME')}
            extraClass={formError && editingIndex === null ? 'error' : ''}
          />
          <span className="env-var-connector">=</span>
          <TextInputField
            htmlId="new-env-value"
            value={newValue}
            onChange={(val) => {
              setNewValue(val)
              setFormError(validateEnv(newKey, val))
            }}
            placeholder={t('options.advanced.placeHolderValue', 'VALUE')}
          />
          <SvgButton
            onClick={handleAdd}
            className="is-primary"
            disabled={!newKey.trim() || !newValue.trim()}
          >
            <AddBoxIcon style={{ color: 'var(--success)' }} fontSize="large" />
          </SvgButton>
        </div>
        {formError && editingIndex === null && (
          <div className="env-var-error">{formError}</div>
        )}
      </div>

      {envVariablesInfo}
    </div>
  )
}

export default EnvVariablesTable
