import classNames from 'classnames'
import { t } from 'i18next'
import React, { useContext } from 'react'
import FormControl from 'src/components/UI/FormControl'
import ContextProvider from 'src/state/ContextProvider'

export default function StoreFilter() {
  const { category, handleCategory } = useContext(ContextProvider)

  return (
    <div className="storeFilter">
      <FormControl segmented small>
        <button
          onClick={() => handleCategory('all')}
          className={classNames('FormControl__button', {
            active: category === 'all'
          })}
          title={`${t('header.platform')}: ${t('All')}`}
        >
          {t('All').toUpperCase()}
        </button>
        <button
          className={classNames('FormControl__button', {
            active: category === 'legendary'
          })}
          onClick={() => handleCategory('legendary')}
        >
          EPIC
        </button>
        <button
          className={classNames('FormControl__button', {
            active: category === 'gog'
          })}
          onClick={() => handleCategory('gog')}
        >
          GOG
        </button>
      </FormControl>
    </div>
  )
}
