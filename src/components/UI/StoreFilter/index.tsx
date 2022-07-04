import classNames from 'classnames'
import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import FormControl from 'src/components/UI/FormControl'
import ContextProvider from 'src/state/ContextProvider'

export default function StoreFilter() {
  const { category, handleCategory } = useContext(ContextProvider)
  const { t } = useTranslation()

  return (
    <div className="storeFilter">
      <FormControl segmented small>
        <button
          onClick={() => handleCategory('all')}
          className={classNames('FormControl__button', {
            active: category === 'all'
          })}
          title={`${t('header.store', 'Filter Store')}: ${t('All')}`}
        >
          {t('All').toUpperCase()}
        </button>
        <button
          className={classNames('FormControl__button', {
            active: category === 'legendary'
          })}
          title={`${t('header.store')}: ${t('store')}`}
          onClick={() => handleCategory('legendary')}
        >
          EPIC
        </button>
        <button
          className={classNames('FormControl__button', {
            active: category === 'gog'
          })}
          title={`${t('header.store')}: ${t('GOG')}`}
          onClick={() => handleCategory('gog')}
        >
          GOG
        </button>
      </FormControl>
    </div>
  )
}
