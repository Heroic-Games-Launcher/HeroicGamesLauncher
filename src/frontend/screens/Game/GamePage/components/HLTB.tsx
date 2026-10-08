import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { Gauge } from 'lucide-react'
import { Icon, Panel } from 'frontend/components/UI'
import HowLongToBeat from 'frontend/components/UI/WikiGameInfo/components/HowLongToBeat'
import GameContext from '../../GameContext'

const HLTB = () => {
  const { t } = useTranslation('gamepage')
  const { wikiInfo } = useContext(GameContext)

  const howlongtobeat = wikiInfo?.howlongtobeat

  if (!howlongtobeat) {
    return null
  }

  return (
    <Panel tone="glass" className="hltbWrapper">
      <h3 className="extraTab__title">
        <Icon glyph={Gauge} size="sm" />
        {t('howLongToBeat', 'How Long To Beat')}
      </h3>
      <HowLongToBeat info={howlongtobeat} />
    </Panel>
  )
}

export default HLTB
