import classNames from 'classnames'
import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import FormControl from 'frontend/components/UI/FormControl'
import ContextProvider from 'frontend/state/ContextProvider'
import SelectField from '../SelectField'
import LibraryContext from 'frontend/screens/Library/LibraryContext'
import './index.css'

export default React.memo(function StoreFilter() {
  const {
    gog,
    epic,
    amazon,
    customCategories,
    currentCustomCategory,
    setCurrentCustomCategory
  } = useContext(ContextProvider)
  const { category, handleCategory } = useContext(LibraryContext)
  const { t } = useTranslation()

  const isGOGLoggedin = gog.username
  const isEpicLoggedin = epic.username
  const isAmazonLoggedin = amazon.user_id

  return (
    <div className="storeFilter">
      <FormControl segmented small>
        <SelectField
          htmlId="custom-category-selector"
          value={currentCustomCategory || ''}
          onChange={(e) => {
            setCurrentCustomCategory(e.target.value)
          }}
        >
          <option value="">
            {t('header.all_categories', 'All Categories')}
          </option>
          <option value="preset_uncategorized">
            {t('header.uncategorized', 'Uncategorized')}
          </option>
          {customCategories.listCategories().map((category) => (
            <option value={category} key={category}>
              {category}
            </option>
          ))}
        </SelectField>
        <button
          onClick={() => handleCategory('all')}
          className={classNames('FormControl__button', {
            active: category === 'all'
          })}
          title={`${t('header.store', 'Filter Store')}: ${t('All')}`}
        >
          {t('All').toUpperCase()}
        </button>
        {isEpicLoggedin && (
          <button
            className={classNames('FormControl__button', {
              active: category === 'legendary'
            })}
            title={`${t('header.store')}: ${t('store')}`}
            onClick={() => handleCategory('legendary')}
          >
            EPIC
          </button>
        )}
        {isGOGLoggedin && (
          <button
            className={classNames('FormControl__button', {
              active: category === 'gog'
            })}
            title={`${t('header.store')}: ${t('GOG')}`}
            onClick={() => handleCategory('gog')}
          >
            GOG
          </button>
        )}
        {isAmazonLoggedin && (
          <button
            className={classNames('FormControl__button', {
              active: category === 'nile'
            })}
            title={`${t('header.store')}: ${t('amazon')}`}
            onClick={() => handleCategory('nile')}
          >
            AMAZON
          </button>
        )}
        <button
          className={classNames('FormControl__button', {
            active: category === 'sideload'
          })}
          title={`${t('header.store')}: ${t('Other')}`}
          onClick={() => handleCategory('sideload')}
        >
          {t('Other')}
        </button>
      </FormControl>
    </div>
  )
})
