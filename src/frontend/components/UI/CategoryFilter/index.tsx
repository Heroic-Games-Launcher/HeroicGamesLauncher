import { useContext } from 'react'
import ContextProvider from 'frontend/state/ContextProvider'
import { useTranslation } from 'react-i18next'
import LibraryContext from 'frontend/screens/Library/LibraryContext'
import Dropdown from '../Dropdown'
import FilterOption, { FilterOptionList } from '../FilterOption'
import { Button, CountBadge, FilterSection, Icon } from 'frontend/components/UI'
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

  const categoryRow = (label: string, value?: string) => {
    const category = value || label

    return (
      <FilterOption
        key={category}
        label={label}
        checked={currentCustomCategories.includes(category)}
        onChange={() => toggleCategory(category)}
        onOnly={() => setCurrentCustomCategories([category])}
        onlyLabel={t('header.only', 'only')}
      />
    )
  }

  const categoriesList = customCategories.listCategories()

  return (
    <Dropdown
      buttonClass="pill"
      className="categoriesFilter"
      dataTour="library-categories"
      title={
        <>
          <Icon glyph={LayoutGrid} size="md" />
          <span className="dropdownButton__label">
            {t('header.categories', 'Categories')}
          </span>
          <CountBadge
            count={currentCustomCategories.length}
            label={t('header.categories_selected', {
              count: currentCustomCategories.length,
              defaultValue_one: '{{count}} category selected',
              defaultValue_other: '{{count}} categories selected'
            })}
          />
          <Icon glyph={ChevronDown} size="sm" />
        </>
      }
    >
      <FilterSection>
        {categoriesList.length === 0 && (
          <p className="FilterSection__empty">
            {t(
              'header.no_categories',
              'No custom categories. Add categories using each game menu.'
            )}
          </p>
        )}
        <FilterOptionList>
          {categoriesList.map((category) => categoryRow(category))}
          {categoryRow(
            t('header.uncategorized', 'Uncategorized'),
            'preset_uncategorized'
          )}
        </FilterOptionList>
      </FilterSection>

      <div className="FilterActions">
        <Button variant="ghost" size="sm" onClick={() => selectAll()}>
          {t('header.select_all', 'Select all')}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowCategories(true)}
        >
          {t('categories-manager.title', 'Manage categories')}
        </Button>
      </div>
    </Dropdown>
  )
}
