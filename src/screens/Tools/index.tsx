import './index.css'

import Header from 'src/components/UI/Header'
import { ToolsInfo } from 'src/types'

import React, { lazy, useContext } from 'react'
import ContextProvider from 'src/state/ContextProvider'
import { useTranslation } from 'react-i18next'

const ToolCard = lazy(
  () => import('src/screens/Tools/components/ToolCard')
)

export default function Tools(): JSX.Element | null {
  const { t } = useTranslation()
  const { tools } = useContext(ContextProvider)

  return (
    <>
      <Header goTo={'/'} renderBackButton title={t('tools.title')} />
      <div className="Tools">
        <div
          style={!tools.length ? { backgroundColor: 'transparent' } : {}}
          className="gameListLayout"
        >
          {!!tools.length &&
            tools.map((release: ToolsInfo, key) => (
              <ToolCard key={key} {...release} />
            ))}
        </div>
      </div>
    </>
  )
}
