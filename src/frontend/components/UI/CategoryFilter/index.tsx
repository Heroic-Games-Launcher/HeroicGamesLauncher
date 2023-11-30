import SelectField from '../SelectField'
import ContextProvider from 'frontend/state/ContextProvider'
import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import './index.css'

export default function CategoryFilter() {
  const { customCategories, currentCustomCategory, setCurrentCustomCategory } =
    useContext(ContextProvider)
  const { t } = useTranslation()

  return (
    <SelectField
      htmlId="custom-category-selector"
      value={currentCustomCategory || ''}
      onChange={(e) => {
        setCurrentCustomCategory(e.target.value)
      }}
    >
      <option value="">{t('header.all_categories', 'All Categories')}</option>
      <option value="preset_uncategorized">
        {t('header.uncategorized', 'Uncategorized')}
      </option>
      {customCategories.listCategories().map((category) => (
        <option value={category} key={category}>
          {category}
        </option>
      ))}
    </SelectField>
  )
}
