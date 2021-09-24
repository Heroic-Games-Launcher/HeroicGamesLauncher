import './index.css';

import Header from 'src/components/UI/Header'
import { WineGEInfo } from 'src/types'

import React, { lazy, useContext } from 'react';
import ContextProvider from 'src/state/ContextProvider';
import { useTranslation } from 'react-i18next';

const WineGECard = lazy(() => import('src/screens/WineGE/components/WineGECard'))

export default function WineGE(): JSX.Element | null {
  const { t } = useTranslation();
  const {winege} = useContext(ContextProvider)

  return (
    <>
      <Header goTo={'/'} renderBackButton title={t('winege.title')} />
      <div className="WineGE">
        <div
          style={!winege.length ? { backgroundColor: 'transparent' } : {}}
          className="gameListLayout"
        >
          {!!winege.length && winege.map((release: WineGEInfo, key) => (
            <WineGECard key={key} {...release}/>
          ))}
        </div>
      </div>
    </>
  )
}