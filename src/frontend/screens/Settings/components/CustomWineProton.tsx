import React, { useCallback, useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SelectField, SvgButton } from 'frontend/components/UI'
import ContextProvider from 'frontend/state/ContextProvider'
import SettingsContext from '../SettingsContext'
import { Tooltip } from '@mui/material'
import AddBoxIcon from '@mui/icons-material/AddBox'
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle'
import { useGlobalConfig } from 'frontend/hooks/config'

export default function CustomWineProton() {
  const { t } = useTranslation()
  const { isDefault } = useContext(SettingsContext)
  const { platform } = useContext(ContextProvider)
  const isWin = platform === 'win32'

  const [customWinePaths, setCustomWinePaths, winePathsFetched] =
    useGlobalConfig('customWinePaths')

  const [selectedPath, setSelectedPath] = useState('')

  useEffect(() => {
    const firstAvailableCustomPath = customWinePaths?.[0]
    if (firstAvailableCustomPath) setSelectedPath(firstAvailableCustomPath)
  }, [customWinePaths])

  const selectCustomPath = useCallback(() => {
    window.api
      .openDialog({
        buttonLabel: t('box.choose'),
        properties: ['openFile'],
        title: t('box.customWine', 'Select the Wine or Proton Binary')
      })
      .then((path) => {
        if (path && !customWinePaths?.includes(path)) {
          setCustomWinePaths([...(customWinePaths ?? []), path])
        }
      })
  }, [customWinePaths])

  const removeCustomPath = useCallback(() => {
    const newPaths =
      customWinePaths?.filter((path) => path !== selectedPath) || []
    setCustomWinePaths(newPaths)
    setSelectedPath(customWinePaths?.[0] ?? '')
  }, [customWinePaths, selectedPath])

  if (!winePathsFetched) {
    return <></>
  }

  if (!isDefault || isWin) {
    return <></>
  }

  return (
    <SelectField
      label={t('setting.customWineProton', 'Custom Wine/Proton Paths')}
      htmlId="selectWinePath"
      disabled={!customWinePaths.length}
      extraClass="rightButtons"
      value={selectedPath}
      onChange={(e) => setSelectedPath(e.target.value)}
      afterSelect={
        <div className="iconsWrapper rightButtons addRemoveSvgButtons">
          <SvgButton onClick={() => removeCustomPath()}>
            <Tooltip
              title={t('tooltip.removepath', 'Remove Path')}
              placement="bottom"
              arrow
            >
              <RemoveCircleIcon
                data-testid="removeWinePath"
                style={{
                  color: selectedPath
                    ? 'var(--danger)'
                    : 'var(--status-warning)',
                  cursor: selectedPath ? 'pointer' : ''
                }}
                fontSize="large"
              />
            </Tooltip>
          </SvgButton>{' '}
          <SvgButton
            onClick={() => selectCustomPath()}
            className={`is-primary`}
          >
            <Tooltip
              title={t('tooltip.addpath', 'Add New Path')}
              placement="bottom"
              arrow
            >
              <AddBoxIcon
                data-testid="addWinePath"
                style={{ color: 'var(--success)', cursor: 'pointer' }}
                fontSize="large"
              />
            </Tooltip>
          </SvgButton>
        </div>
      }
    >
      {customWinePaths.map((path: string) => (
        <option key={path}>{path}</option>
      ))}
    </SelectField>
  )
}
