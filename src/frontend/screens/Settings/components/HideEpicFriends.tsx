import { useContext } from 'react'
import { useTranslation } from 'react-i18next'

import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'

const HideEpicFriends = () => {
  const { t } = useTranslation()
  const { epic } = useContext(ContextProvider)
  const [hideEpicFriends, setHideEpicFriends] = useSetting(
    'hideEpicFriends',
    false
  )

  if (!epic.username) return null

  const handleChange = () => {
    const nextValue = !hideEpicFriends
    setHideEpicFriends(nextValue)
    window.dispatchEvent(
      new CustomEvent('hide-epic-friends-changed', { detail: nextValue })
    )
  }

  return (
    <ToggleSwitch
      htmlId="hideEpicFriends"
      value={hideEpicFriends}
      handleChange={handleChange}
      title={t('setting.hideEpicFriends', 'Hide Epic Friends')}
    />
  )
}

export default HideEpicFriends
