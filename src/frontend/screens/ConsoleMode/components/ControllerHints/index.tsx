import { useTranslation } from 'react-i18next'

import type { ControllerLayout } from '../../controller'

export default function ControllerHints({
  layout
}: {
  layout: ControllerLayout
}) {
  const { t } = useTranslation()
  return (
    <div className={`consoleControllerHints ${layout}`}>
      <div className="hint">
        <i className="buttonImage main-action" />
        {t('console.hints.launch', 'Launch')}
      </div>
      <div className="hint">
        <i className="buttonImage back" />
        {t('console.hints.quit', 'Quit')}
      </div>
      <div className="hint">
        <i className="buttonImage shoulder-l" />
        <i className="buttonImage shoulder-r" />
        {t('console.hints.change_store', 'Change store')}
      </div>
      <div className="hint">
        <i className="buttonImage trigger-r" />
        {t('console.hints.sort', 'Sort')}
      </div>
      <div className="hint">
        <i className="buttonImage d-pad" />
        <i className="buttonImage left-stick" />
        {t('console.hints.navigate', 'Navigate')}
      </div>
    </div>
  )
}
