import { useContext } from 'react'
import ContextProvider from 'frontend/state/ContextProvider'
import { useTranslation } from 'react-i18next'
import LibraryContext from 'frontend/screens/Library/LibraryContext'
import Dropdown from '../Dropdown'
import { Button, Chip, FilterSection, Icon } from 'frontend/components/UI'
import { LayoutGrid, ChevronDown } from 'lucide-react'
import './index.css'

export default function CategoryFilter() {
  const {
    customCategories,
    currentCustomCategories,
    setCurrentCustomCategories
  } = useContext(ContextProvider)
  const { setShowCategories } = useContext(LibraryContext)
  const { t } = useTranslation()

  const toggleCategory = (category: string) => {
    if (currentCustomCategories.includes(category)) {
      setCurrentCustomCategories(
        currentCustomCategories.filter((cat) => cat !== category)
      )
    } else {
      setCurrentCustomCategories([...currentCustomCategories, category])
    }
  }

  const selectAll = () => {
    setCurrentCustomCategories(
      ['preset_uncategorized'].concat(customCategories.listCategories())
    )
  }

  const categoryChip = (label: string, value?: string) => {
    const category = value || label

    return (
      <span className="categoryChip" key={category}>
        <Chip
          active={currentCustomCategories.includes(category)}
          onClick={() => toggleCategory(category)}
        >
          {label}
        </Chip>
        <button
          className="categoryOnly"
          onClick={() => setCurrentCustomCategories([category])}
        >
          {t('header.only', 'only')}
        </button>
      </span>
    )
  }

  const categoriesList = customCategories.listCategories()

  return (
    <Dropdown
      buttonClass="pill"
      className="categoriesFilter"
      data-tour="library-categories"
      title={
        <>
          <Icon glyph={LayoutGrid} size="md" />
          <span>{t('header.categories', 'Categories')}</span>
          <Icon glyph={ChevronDown} size="sm" />
        </>
      }
      popUpOnHover
    >
      <FilterSection label={t('header.categories', 'Categories')}>
        {categoriesList.length === 0 && (
          <p className="FilterSection__empty">
            {t(
              'header.no_categories',
              'No custom categories. Add categories using each game menu.'
            )}
          </p>
        )}
        {categoriesList.map((category) => categoryChip(category))}
        {categoryChip(
          t('header.uncategorized', 'Uncategorized'),
          'preset_uncategorized'
        )}
      </FilterSection>

      <div className="FilterActions">
        <Button variant="ghost" size="sm" onClick={() => selectAll()}>
          {t('header.select_all', 'Select All')}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowCategories(true)}
        >
          {t('categories-manager.title', 'Manage Categories')}
        </Button>
      </div>
    </Dropdown>
  )
}
