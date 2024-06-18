import React, { useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'
import GameContext from '../../GameContext'
import { Speed, ExpandMore } from '@mui/icons-material'
import { Accordion, AccordionSummary, AccordionDetails } from '@mui/material'
import PopoverComponent from 'frontend/components/UI/PopoverComponent'
import HowLongToBeat from 'frontend/components/UI/WikiGameInfo/components/HowLongToBeat'
import { useShallowGlobalState } from 'frontend/state/GlobalStateV2'

const HLTB = () => {
  const { t } = useTranslation('gamepage')
  const { wikiInfo } = useContext(GameContext)
  const { enableNewDesign } = useShallowGlobalState('enableNewDesign')

  const [isExpanded, setIsExpanded] = useState(false)

  function handleExpansionChange() {
    setIsExpanded((prevExpanded) => !prevExpanded)
  }

  if (!wikiInfo) {
    return null
  }

  const howlongtobeat = wikiInfo.howlongtobeat

  if (!howlongtobeat) {
    return null
  }

  if (enableNewDesign) {
    return (
      <div className="hltbWrapper">
        <Accordion expanded={isExpanded} onChange={handleExpansionChange}>
          <AccordionSummary
            expandIcon={<ExpandMore />}
            aria-controls="hltb-content"
            id="hltb-header"
            title={t('info.clickToOpen', 'Click to open')}
          >
            <Speed />
            <b>{t('howLongToBeat', 'How Long To Beat')}</b>
          </AccordionSummary>
          <AccordionDetails>
            <HowLongToBeat info={howlongtobeat} />
          </AccordionDetails>
        </Accordion>
      </div>
    )
  } else {
    return (
      <PopoverComponent
        item={
          <div
            className="iconWithText"
            title={t('info.clickToOpen', 'Click to open')}
          >
            <Speed />
            <b>{t('howLongToBeat', 'How Long To Beat')}</b>
          </div>
        }
      >
        <div className="poppedElement">
          <HowLongToBeat info={howlongtobeat} />
        </div>
      </PopoverComponent>
    )
  }
}

export default HLTB
