import React from 'react'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import { useTranslation } from 'react-i18next'
import { useGlobalState } from 'frontend/state/GlobalStateV2'

const HideChangelogOnStartup = () => {
  const { t } = useTranslation()
  const [hideChangelogsOnStartupSetting, setHideChangelogsOnStartupSetting] =
    useSetting('hideChangelogsOnStartup', false)

  const handleChange = () => {
    setHideChangelogsOnStartupSetting(!hideChangelogsOnStartupSetting)
    useGlobalState.setState({
      hideChangelogsOnStartup: !hideChangelogsOnStartupSetting
    })
  }

  return (
    <ToggleSwitch
      htmlId="hideChangelogsOnStartup"
      value={hideChangelogsOnStartupSetting}
      handleChange={handleChange}
      title={t(
        'setting.hideChangelogsOnStartup',
        "Don't show changelogs on Startup"
      )}
    />
  )
}

export default HideChangelogOnStartup
