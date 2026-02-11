import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter
} from 'frontend/components/UI/Dialog'
import {
  ToggleSwitch,
  TextInputField,
  InfoIcon,
  SelectField
} from 'frontend/components/UI'
import { WineManagerUISettings, Type } from 'common/types'
import { faPlus, faTrash, faSyncAlt } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { MenuItem } from '@mui/material'

interface Props {
  settings: WineManagerUISettings[]
  isLinux: boolean
  onSave: (settings: WineManagerUISettings[]) => void
  onClose: () => void
}

export default function WineManagerSettingsModal({
  settings,
  isLinux,
  onSave,
  onClose
}: Props) {
  const { t } = useTranslation()
  const [localSettings, setLocalSettings] =
    useState<WineManagerUISettings[]>(settings)
  const [customRepo, setCustomRepo] = useState('')

  const availableTypes: Type[] = useMemo(() => {
    if (isLinux) {
      return ['GE-Proton', 'Wine-GE', 'Proton', 'Wine-Lutris', 'Wine-Kron4ek']
    }
    return [
      'Wine-Crossover',
      'Wine-Staging-macOS',
      'Game-Porting-Toolkit',
      'Wine-Kron4ek'
    ]
  }, [isLinux])

  const [selectedType, setSelectedType] = useState<Type>(availableTypes[0])
  const [isCheckingRepo, setIsCheckingRepo] = useState(false)
  const [errorText, setErrorText] = useState('')

  const toggleRepo = (index: number) => {
    const newSettings = [...localSettings]
    newSettings[index].enabled = !newSettings[index].enabled
    setLocalSettings(newSettings)
  }

  const addCustomRepo = async () => {
    setErrorText('')
    if (!customRepo) return

    const parts = customRepo.trim().split('/')
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      setErrorText(
        t('wine.manager.invalid_repo_format', 'Invalid format. Use owner/repo.')
      )
      return
    }

    setIsCheckingRepo(true)
    try {
      const response = await fetch(`https://api.github.com/repos/${customRepo}`)
      if (!response.ok) {
        setErrorText(
          t('wine.manager.repo_not_found', 'Repository not found on GitHub.')
        )
        setIsCheckingRepo(false)
        return
      }
    } catch (e) {
      // If we can't check (e.g. offline), we show a warning but let them add it anyway?
      // Or just fail. Let's show a warning.
      console.error('Failed to verify repository', e)
    }
    setIsCheckingRepo(false)

    const newRepo: WineManagerUISettings = {
      type: selectedType,
      value: `custom-${customRepo}`,
      enabled: true
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
          {localSettings.map((repo, index) => {
            // Hide platform specific repos
            const isRepoLinux =
              repo.type === 'GE-Proton' ||
              repo.type === 'Wine-GE' ||
              repo.type === 'Proton' ||
              repo.type === 'Wine-Lutris'
            const isRepoMac =
              repo.type === 'Wine-Crossover' ||
              repo.type === 'Wine-Staging-macOS' ||
              repo.type === 'Game-Porting-Toolkit'

            if ((isLinux && isRepoMac) || (!isLinux && isRepoLinux)) {
              return null
            }

            return (
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
            )
          })}
        </div>

        <div className="addRepo">
          <h4>
            {t('wine.manager.add_custom', 'Add Custom GitHub Repository')}
          </h4>
          <div className="inputWrapper">
            <SelectField
              htmlId="custom-repo-type"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as Type)}
              label={t('wine.manager.type', 'Type')}
              extraClass="typeSelect"
            >
              {availableTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </SelectField>
            <TextInputField
              placeholder="owner/repo (e.g., GloriousEggroll/proton-ge-custom)"
              value={customRepo}
              onChange={(val) => setCustomRepo(val)}
              htmlId="wine-manager-custom-add"
              label={t('wine.manager.repo_path', 'Repository Path')}
            />
            <button
              className="addBtn"
              onClick={addCustomRepo}
              disabled={isCheckingRepo}
            >
              <FontAwesomeIcon icon={isCheckingRepo ? faSyncAlt : faPlus} className={isCheckingRepo ? 'fa-spin' : ''} />
            </button>
            <InfoIcon
              text={t(
                'wine.manager.custom_help',
                'Enter the GitHub repository in "owner/repo" format. Example: GloriousEggroll/proton-ge-custom'
              )}
            />
          </div>
          {errorText && <div className="errorText" style={{ color: 'var(--error)', marginTop: '8px', fontSize: '0.9rem' }}>{errorText}</div>}
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
