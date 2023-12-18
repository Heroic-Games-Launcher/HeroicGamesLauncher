import React, { useContext } from 'react'
import ContextProvider from 'frontend/state/ContextProvider'
import { useTranslation } from 'react-i18next'

type ReleaseDateProps = {
  date: string[] | undefined
  isLinuxNative: boolean
  isMacNative: boolean
}

const ReleaseDate: React.FC<ReleaseDateProps> = ({
  date,
  isLinuxNative,
  isMacNative
}) => {
  const { platform } = useContext(ContextProvider)
  const {t} = useTranslation()

  if (!date || date[0] === '' || date.length === 0) {
    return null
  }

  const isLinux = platform === 'linux'
  const isMac = platform === 'darwin'

  const getReleaseDate = () => {
    let windowsReleaseDate = ''

    for (let i = 0; i < date.length; i++) {
      const [platformName, releaseDate] = date[i].split(': ')

      if (platformName === 'Windows') {
        windowsReleaseDate = releaseDate
      }

      if (
        (platformName === 'Linux' && isLinuxNative && isLinux) ||
        (platformName === 'OS X' && isMacNative && isMac)
      ) {
        return releaseDate
      }
    }

    return windowsReleaseDate || t('label.unknownReleaseDate', 'Unknown Release Date')
  }

  return <div className="releaseDate">{t('label.releaseDate', 'Release Date: ')}:  {getReleaseDate()}</div>
}

export default ReleaseDate
