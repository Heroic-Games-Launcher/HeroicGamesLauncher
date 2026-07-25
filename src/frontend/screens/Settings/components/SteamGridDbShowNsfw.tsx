import { useTranslation } from 'react-i18next'
import useSetting from 'frontend/hooks/useSetting'
import { ToggleSwitch } from 'frontend/components/UI'

const SteamGridDbShowNsfw = () => {
  const { t } = useTranslation()
  const [showNsfw, setShowNsfw] = useSetting('steamGridDbShowNsfw', false)

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="steamGridDbShowNsfw"
        value={showNsfw}
        handleChange={() => setShowNsfw(!showNsfw)}
        title={t(
          'settings.steamgriddb.nsfw.label',
          'Show adult content in SteamGridDB search results'
        )}
      />
    </div>
  )
}

export default SteamGridDbShowNsfw
