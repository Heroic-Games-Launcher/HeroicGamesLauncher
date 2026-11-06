import { ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import useSetting from 'frontend/hooks/useSetting'
import { WarningMessage } from 'frontend/components/UI'

const CustomCSS = () => {
  const { t } = useTranslation()
  const [customCSS, setCustomCSS] = useSetting('customCSS', '')

  const handleCustomCSS = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setCustomCSS(event.currentTarget.value)
    window.setCustomCSS(event.currentTarget.value)
  }

  return (
    <div className="customCSSField">
      <label className="customCSSLabel" htmlFor="customCSSArea">
        {t('settings.custom_css.title', 'Custom CSS Style')}
      </label>
      <textarea
        id="customCSSArea"
        defaultValue={customCSS}
        className="customCSSArea"
        onChange={handleCustomCSS}
        rows={5}
      />
      <WarningMessage>
        {t(
          'setting.custom_css.warning',
          "Warning: this applies to the whole frontend. That means the wrong style can render Heroic unusable. If needed, the setting can be changes manually in `~/.config/heroic/config.json`. Do NOT copy styles from sources you don't trust."
        )}
      </WarningMessage>
    </div>
  )
}

export default CustomCSS
