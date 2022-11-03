import React, { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SelectField, SvgButton } from 'frontend/components/UI'
import ContextProvider from 'frontend/state/ContextProvider'
import { Path } from 'frontend/types'
import useSetting from 'frontend/hooks/useSetting'
import SettingsContext from '../SettingsContext'
import { Tooltip } from '@mui/material'
import AddBoxIcon from '@mui/icons-material/AddBox'
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle'

export default function CustomWineProton() {
  const { t } = useTranslation()
  const { isDefault } = useContext(SettingsContext)
  const { platform } = useContext(ContextProvider)
  const isLinux = platform === 'linux'

  const [customWinePaths, setCustomWinePaths] = useSetting(
    'customWinePaths',
    []
  )

  const [selectedPath, setSelectedPath] = useState('')

  useEffect(() => {
    setSelectedPath(customWinePaths.length ? customWinePaths[0] : '')
  }, [customWinePaths])

  function selectCustomPath() {
    window.api
      .openDialog({
        buttonLabel: t('box.choose'),
        properties: ['openFile'],
        title: t('box.customWine', 'Select the Wine or Proton Binary')
      })
      .then(({ path }: Path) => {
        if (!customWinePaths.includes(path)) {
          setCustomWinePaths(
            path ? [...customWinePaths, path] : customWinePaths
          )
        }
      })
  }

  function removeCustomPath() {
    const newPaths = customWinePaths.filter((path) => path !== selectedPath)
    setCustomWinePaths(newPaths)
    return setSelectedPath(customWinePaths.length ? customWinePaths[0] : '')
  }

  if (!isDefault || !isLinux) {
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
              title={t('tooltip.removepath', 'Remove Path') as string}
              placement="bottom"
              arrow
            >
              <RemoveCircleIcon
                data-testid="removeWinePath"
                style={{
                  color: selectedPath
                    ? 'var(--danger)'
                    : 'var(--text-tertiary)',
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
              title={t('tooltip.addpath', 'Add New Path') as string}
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
