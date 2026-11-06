import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'

const DisableDiscounts = () => {
  const { t } = useTranslation()
  const [disableDiscounts, setDisableDiscounts] = useSetting(
    'disableDiscounts',
    false
  )
  const { setDisableDiscounts: setDisableDiscountsContext } =
    useContext(ContextProvider)

  const handleChange = () => {
    setDisableDiscounts(!disableDiscounts)
    setDisableDiscountsContext(!disableDiscounts)
  }

  return (
    <ToggleSwitch
      htmlId="disableDiscounts"
      value={disableDiscounts}
      handleChange={handleChange}
      title={t('setting.disableDiscounts', 'Disable Deals page')}
    />
  )
}

export default DisableDiscounts
