import React, { useState } from 'react'
import ToggleSwitch from 'frontend/components/UI/ToggleSwitch'
import { useTranslation } from 'react-i18next'
import { DLCInfo } from 'common/types/legendary'

interface Props {
  DLCList: DLCInfo[]
  dlcsToInstall: string[]
  setDlcsToInstall: (dlcs: string[]) => void
}

const DLCDownloadListing: React.FC<Props> = ({
  DLCList,
  setDlcsToInstall,
  dlcsToInstall
}) => {
  const { t } = useTranslation()
  const [installAllDlcs, setInstallAllDlcs] = useState(false)

  if (!DLCList) {
    return null
  }

  const handleAllDlcs = () => {
    setInstallAllDlcs(!installAllDlcs)
    if (!installAllDlcs) {
      setDlcsToInstall(DLCList.map(({ app_name }) => app_name))
    }

    if (installAllDlcs) {
      setDlcsToInstall([])
    }
  }

  const handleDlcToggle = (index: number) => {
    const { app_name } = DLCList[index]
    const newDlcsToInstall = [...dlcsToInstall]
    if (newDlcsToInstall.includes(app_name)) {
      newDlcsToInstall.splice(newDlcsToInstall.indexOf(app_name), 1)
    } else {
      newDlcsToInstall.push(app_name)
    }
    setDlcsToInstall(newDlcsToInstall)
    setInstallAllDlcs(newDlcsToInstall.length === DLCList.length)
  }

  return (
    <div className="InstallModal__dlcs">
      <label className="InstallModal__toggle toggleWrapper">
        <ToggleSwitch
          htmlId="dlcs"
          value={installAllDlcs}
          handleChange={() => handleAllDlcs()}
          title={t('dlc.installDlcs', 'Install all DLCs')}
        />
      </label>
      <div className="InstallModal__dlcsList">
        {DLCList?.map(({ title, app_name }, index) => (
          <label
            key={title}
            className="InstallModal__toggle toggleWrapper"
            title={title}
          >
            <ToggleSwitch
              htmlId={`dlc-${index}`}
              value={dlcsToInstall.includes(app_name)}
              title={title}
              handleChange={() => handleDlcToggle(index)}
            />
          </label>
        ))}
      </div>
    </div>
  )
}

export default DLCDownloadListing
