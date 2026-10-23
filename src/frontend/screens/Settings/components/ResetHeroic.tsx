import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Icon, InfoTooltip, SettingRow } from 'frontend/components/UI'
import ContextProvider from 'frontend/state/ContextProvider'
import { Trash2 } from 'lucide-react'

const ResetHeroic = () => {
  const { showResetDialog } = useContext(ContextProvider)
  const { t } = useTranslation()

  return (
    <SettingRow
      label={t('settings.advanced.title.resetHeroic', 'Reset Heroic')}
      labelAfter={
        <InfoTooltip
          content={t(
            'settings.advanced.resetHeroic.help',
            "This will remove all Settings and Caching but won't remove your Installed games or your Epic credentials. Portable versions (AppImage, WinPortable, ...) of Heroic needs to be restarted manually afterwards."
          )}
          label={t('settings.advanced.title.resetHeroic', 'Reset Heroic')}
        />
      }
      description={t(
        'settings.advanced.resetHeroic.description',
        'Restores Heroic to its defaults. Installed games and store logins are kept.'
      )}
    >
      <Button
        variant="dangerSubtle"
        icon={<Icon glyph={Trash2} size="md" />}
        onClick={showResetDialog}
      >
        {t('settings.reset-heroic', 'Reset Heroic')}
      </Button>
    </SettingRow>
  )
}

export default ResetHeroic
