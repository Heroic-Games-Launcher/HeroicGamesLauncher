import { InfoBox, TextInputField } from 'frontend/components/UI'
import { Trans, useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { removeSpecialcharacters } from 'frontend/helpers'

type Props = {
  title: string
  setTitle: (val: string) => void
  platformSelection: React.ReactNode
}

export default function MetadataStep({
  title,
  setTitle,
  platformSelection
}: Props) {
  const { t, i18n } = useTranslation('gamepage')

  function handleTitle(value: string) {
    value = removeSpecialcharacters(value)
    setTitle(value)
  }

  return (
    <div className="sieloadMetadataForm">
      <InfoBox
        text={t(
          'sideload.import-hint.title',
          'Important! Are you adding a game from Epic/GOG/Amazon? Click here!'
        )}
      >
        <div className="sideloadImportHint">
          <Trans i18n={i18n} key="sideload.import-hint.content">
            Do NOT use this feature for that.
            <br />
            Instead, <NavLink to={'/login'}>log into</NavLink> the store, look
            for the game in your library, open the installation dialog, and
            click the &quot;Import Game&quot; button
          </Trans>
        </div>
      </InfoBox>
      <TextInputField
        label={t('sideload.info.title', 'Game/App Title')}
        placeholder={t(
          'sideload.placeholder.title',
          'Add a title to your Game/App'
        )}
        onChange={(newValue) => handleTitle(newValue)}
        htmlId="sideload-title"
        value={title}
        maxLength={40}
      />
      {platformSelection}
    </div>
  )
}
