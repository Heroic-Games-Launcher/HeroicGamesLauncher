import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'

const DisableGOGAffiliate = () => {
  const { t } = useTranslation()
  const [enableGOGAffiliate, setEnableGOGAffiliate] = useSetting(
    'enableGOGAffiliate',
    false
  )
  const { setDisableGOGAffiliate: setDisableGOGAffiliateContext } =
    useContext(ContextProvider)

  const handleChange = () => {
    setEnableGOGAffiliate(!enableGOGAffiliate)
    setDisableGOGAffiliateContext(enableGOGAffiliate)
  }

  return (
    <ToggleSwitch
      htmlId="disableGOGAffiliate"
      value={!enableGOGAffiliate}
      handleChange={handleChange}
      title={t('setting.disableGOGAffiliate', 'Disable GOG affiliate link')}
    />
  )
}

export default DisableGOGAffiliate
