import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter
} from 'frontend/components/UI/Dialog'
import { ToggleSwitch, TextInputField, InfoIcon } from 'frontend/components/UI'
import { WineManagerUISettings } from 'common/types'
import { faPlus, faTrash } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

interface Props {
  settings: WineManagerUISettings[]
  onSave: (settings: WineManagerUISettings[]) => void
  onClose: () => void
}

export default function WineManagerSettingsModal({
  settings,
  onSave,
  onClose
}: Props) {
  const { t } = useTranslation()
  const [localSettings, setLocalSettings] =
    useState<WineManagerUISettings[]>(settings)
  const [customRepo, setCustomRepo] = useState('')

  const toggleRepo = (index: number) => {
    const newSettings = [...localSettings]
    newSettings[index].enabled = !newSettings[index].enabled
    setLocalSettings(newSettings)
  }

  const addCustomRepo = () => {
    if (!customRepo) return
    // Simple validation for owner/repo format
    if (!customRepo.includes('/')) return

    const newRepo: WineManagerUISettings = {
      type: 'GE-Proton', // Default type for custom repos from GE proton like ones
      value: `custom-${customRepo}`,
      enabled: true
      // Custom repos might need more metadata depending on backend support,
      // but for UI we treat them similarly
    }
    setLocalSettings([...localSettings, newRepo])
    setCustomRepo('')
  }

  const removeRepo = (index: number) => {
    const newSettings = [...localSettings]
    newSettings.splice(index, 1)
    setLocalSettings(newSettings)
  }

  return (
    <Dialog onClose={onClose} showCloseButton={true}>
      <DialogHeader>
        <h3>{t('wine.manager.settings', 'Wine Manager Settings')}</h3>
      </DialogHeader>
      <DialogContent className="wineManagerSettingsContent">
        <div className="repoList">
          <h4>{t('wine.manager.repositories', 'Repositories')}</h4>
          {localSettings.map((repo, index) => (
            <div key={repo.value} className="repoItem">
              <div className="repoInfo">
                <span>{repo.type}</span>
                <small>{repo.value}</small>
              </div>
              <div className="repoActions">
                <ToggleSwitch
                  htmlId={`toggle-${repo.value}`}
                  handleChange={() => toggleRepo(index)}
                  value={repo.enabled}
                  title={t('wine.manager.enable', 'Enable')}
                />
                {repo.value.startsWith('custom-') && (
                  <button
                    className="removeBtn"
                    onClick={() => removeRepo(index)}
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="addRepo">
          <h4>
            {t('wine.manager.add_custom', 'Add Custom GitHub Repository')}
          </h4>
          <div className="inputWrapper">
            <TextInputField
              placeholder="owner/repo (e.g., GloriousEggroll/proton-ge-custom)"
              value={customRepo}
              onChange={(val) => setCustomRepo(val)}
              htmlId="wine-manager-custom-add"
            />
            <button className="addBtn" onClick={addCustomRepo}>
              <FontAwesomeIcon icon={faPlus} />
            </button>
            <InfoIcon
              text={t(
                'wine.manager.custom_help',
                'Enter the GitHub repository in "owner/repo" format. Example: GloriousEggroll/proton-ge-custom'
              )}
            />
          </div>
        </div>
      </DialogContent>
      <DialogFooter>
        <button className="button is-secondary" onClick={onClose}>
          {t('generic.cancel', 'Cancel')}
        </button>
        <button
          className="button is-primary"
          onClick={() => onSave(localSettings)}
        >
          {t('generic.save', 'Save')}
        </button>
      </DialogFooter>
    </Dialog>
  )
}
