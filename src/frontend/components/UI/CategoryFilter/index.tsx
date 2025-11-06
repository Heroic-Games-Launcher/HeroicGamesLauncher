import { useContext } from 'react'
import ContextProvider from 'frontend/state/ContextProvider'
import { useTranslation } from 'react-i18next'
import ToggleSwitch from '../ToggleSwitch'
import LibraryContext from 'frontend/screens/Library/LibraryContext'

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
      const newCategories = currentCustomCategories.filter(
        (cat) => cat !== category
      )
      setCurrentCustomCategories(newCategories)
    } else {
      setCurrentCustomCategories([...currentCustomCategories, category])
    }
  }

  const resetCategories = () => setCurrentCustomCategories([])

  const categoryToggle = (categoryName: string, categoryValue?: string) => (
    <ToggleSwitch
      htmlId={categoryValue || categoryName}
      handleChange={() => toggleCategory(categoryValue || categoryName)}
      value={currentCustomCategories.includes(categoryValue || categoryName)}
      title={categoryName}
    />
  )

  const categoriesList = customCategories.listCategories()

  return (
    <div className="categoriesFilter" data-tour="library-categories">
      <button className="selectStyle">
        {t('header.categories', 'Categories')}
      </button>
      <div className="dropdown">
        {categoriesList.length === 0 && (
          <>
            <span>
              {t(
                'header.no_categories',
                'No custom categories. Add categories using each game menu.'
              )}
            </span>
            <hr />
          </>
        )}
        {categoriesList.map((category) => categoryToggle(category))}
        {categoryToggle(
          t('header.uncategorized', 'Uncategorized'),
          'preset_uncategorized'
        )}
        <hr />
        <button
          type="reset"
          className="button is-primary"
          onClick={() => resetCategories()}
        >
          {t('header.reset', 'Reset')}
        </button>
        <button
          className="button is-secondary is-small"
          onClick={() => setShowCategories(true)}
        >
          {t('categories-manager.title', 'Manage Categories')}
        </button>
      </div>
    </div>
  )
}
