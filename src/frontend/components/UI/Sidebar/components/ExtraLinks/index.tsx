import {
  faBookOpen,
  faCoffee,
  faHandshake
} from '@fortawesome/free-solid-svg-icons'
import { ExpandMore } from '@mui/icons-material'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { NavLink } from 'react-router-dom'
import classNames from 'classnames'
import React, { useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { faDiscord, faPatreon } from '@fortawesome/free-brands-svg-icons'
import { openDiscordLink } from 'frontend/helpers'

import ContextProvider from 'frontend/state/ContextProvider'
import QuitButton from '../QuitButton'
import { SHOW_EXTERNAL_LINK_DIALOG_STORAGE_KEY } from 'frontend/components/UI/ExternalLinkDialog'
import { Accordion, AccordionDetails, AccordionSummary } from '@mui/material'

export default function ExtraLinks() {
  const { t } = useTranslation()

  const { handleExternalLinkDialog } = useContext(ContextProvider)

  const [isDonateExpanded, setIsDonateExpanded] = useState(false)

  function handleExternalLink(linkCallback: () => void) {
    const showExternalLinkDialog: boolean = JSON.parse(
      localStorage.getItem(SHOW_EXTERNAL_LINK_DIALOG_STORAGE_KEY) ?? 'true'
    )
    if (showExternalLinkDialog) {
      handleExternalLinkDialog({ showDialog: true, linkCallback })
    } else {
      linkCallback()
    }
  }

  return (
    <div className="SidebarLinks Sidebar__section">
      <NavLink
        data-testid="wiki"
        className={({ isActive }) =>
          classNames('Sidebar__item', { active: isActive })
        }
        to={{ pathname: '/wiki' }}
      >
        <div className="Sidebar__itemIcon">
          <FontAwesomeIcon
            icon={faBookOpen}
            title={t('docs', 'Documentation')}
          />
        </div>
        <span>{t('docs', 'Documentation')}</span>
      </NavLink>
      <button
        className="Sidebar__item"
        onClick={() => handleExternalLink(openDiscordLink)}
      >
        <div className="Sidebar__itemIcon">
          <FontAwesomeIcon
            icon={faDiscord}
            title={t('userselector.discord', 'Discord')}
          />
        </div>
        <span>{t('userselector.discord', 'Discord')}</span>
      </button>
      <div
        className={classNames('Sidebar__item', {
          active: isDonateExpanded
        })}
      >
        <Accordion
          expanded={isDonateExpanded}
          onChange={() => setIsDonateExpanded(!isDonateExpanded)}
        >
          <AccordionSummary expandIcon={<ExpandMore />}>
            <div className="Sidebar__itemIcon">
              <FontAwesomeIcon
                icon={faHandshake}
                title={t('donate', 'Donate')}
              />
            </div>
            <span>{t('donate', 'Donate')}</span>
          </AccordionSummary>
          <AccordionDetails>
            <button
              className="Sidebar__item SidebarLinks__subItem"
              onClick={() => handleExternalLink(window.api.openPatreonPage)}
            >
              <div className="Sidebar__itemIcon">
                <FontAwesomeIcon icon={faPatreon} title="Patreon" />
              </div>
              <span>Patreon</span>
            </button>
            <button
              className="Sidebar__item SidebarLinks__subItem"
              onClick={() => handleExternalLink(window.api.openKofiPage)}
            >
              <div className="Sidebar__itemIcon">
                <FontAwesomeIcon icon={faCoffee} title="Ko-fi" />
              </div>
              <span>Ko-fi</span>
            </button>
          </AccordionDetails>
        </Accordion>
      </div>
      <QuitButton />
    </div>
  )
}
