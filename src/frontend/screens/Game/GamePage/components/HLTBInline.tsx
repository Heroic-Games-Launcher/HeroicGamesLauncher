import React, { useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'
import GameContext from '../../GameContext'
import { Speed, ExpandMore } from '@mui/icons-material'
import { Accordion, AccordionSummary, AccordionDetails } from '@mui/material'
import HowLongToBeat from 'frontend/components/UI/WikiGameInfo/components/HowLongToBeat'

const HLTBInline = () => {
  const { t } = useTranslation('gamepage')
  const { wikiInfo } = useContext(GameContext)

  const [isExpanded, setIsExpanded] = useState(false)

  function handleChange() {
    setIsExpanded((prevExpanded) => !prevExpanded)
  }

  if (!wikiInfo) {
    return null
  }

  const howlongtobeat = wikiInfo.howlongtobeat

  if (!howlongtobeat) {
    return null
  }

  return (
    <div className="hltbWrapper">
      <Accordion expanded={isExpanded} onChange={handleChange}>
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
}

export default HLTBInline
