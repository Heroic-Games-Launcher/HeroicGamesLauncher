import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import GameContext from '../../GameContext'

const Description = () => {
  const { t } = useTranslation('gamepage')
  const { gameExtraInfo, gameInfo } = useContext(GameContext)

  const description =
    gameExtraInfo?.about?.shortDescription ||
    gameExtraInfo?.about?.description ||
    gameInfo?.description ||
    t('generic.noDescription', 'No description available')

  const paragraphs = description
    .split(/\n{2,}|\r\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  return (
    <section className="aboutGame">
      <h2 className="aboutGame__title">{t('game.about', 'About This Game')}</h2>
      <div className="summary">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </section>
  )
}

export default Description
