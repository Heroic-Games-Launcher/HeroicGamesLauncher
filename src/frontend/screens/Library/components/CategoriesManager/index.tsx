import { useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'
import LibraryContext from '../../LibraryContext'
import ContextProvider from 'frontend/state/ContextProvider'
import { Dialog, DialogHeader } from 'frontend/components/UI/Dialog'
import { DialogContent } from '@mui/material'
import { Button, Icon, TextInputField } from 'frontend/components/UI'
import './index.css'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'

interface CategoryItemProps {
  name: string
  removeFunction: (name: string) => void
  renameFunction: (oldName: string, newName: string) => void
}

function CategoryItem({
  name,
  removeFunction,
  renameFunction
}: CategoryItemProps) {
  const { t } = useTranslation()
  const [renameMode, setRenameMode] = useState(false)
  const [newName, setNewName] = useState(name)
  const [removeMode, setRemoveMode] = useState(false)
  const isNewNameEmptyOrEqualsOldName =
    newName.trim() === '' || newName === name

  const rename = () => {
    renameFunction(name, newName)
    setRenameMode(false)
    setNewName(newName)
  }

  const cancelEdit = () => {
    setRenameMode(false)
    setNewName(name)
  }

  const remove = () => {
    removeFunction(name)
  }

  const leftButton = () => {
    if (renameMode) {
      return (
        <Button
          variant="primary"
          size="sm"
          onClick={() => rename()}
          title={t(
            'categories-manager.confirm-rename',
            'Confirm rename of "{{oldName}}" as "{{newName}}"',
            { oldName: name, newName }
          )}
          disabled={isNewNameEmptyOrEqualsOldName}
          icon={<Icon glyph={Check} size="md" />}
        />
      )
    } else if (removeMode) {
      return (
        <Button
          variant="danger"
          size="sm"
          onClick={() => remove()}
          title={t(
            'categories-manager.confirm-remove',
            'Confirm removal of "{{name}}"',
            { name }
          )}
          icon={<Icon glyph={Check} size="md" />}
        />
      )
    } else {
      return (
        <Button
          variant="danger"
          size="sm"
          onClick={() => setRemoveMode(true)}
          title={t('categories-manager.remove', 'Remove "{{name}}"', { name })}
          icon={<Icon glyph={Trash2} size="md" />}
        />
      )
    }
  }

  const rightButton = () => {
    if (renameMode) {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => cancelEdit()}
          title={t(
            'categories-manager.cancel-rename',
            'Cancel rename of "{{name}}"',
            { name }
          )}
          icon={<Icon glyph={X} size="md" />}
        />
      )
    } else if (removeMode) {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setRemoveMode(false)}
          title={t(
            'categories-manager.cancel-remove',
            'Cancel removal of "{{name}}"',
            { name }
          )}
          icon={<Icon glyph={X} size="md" />}
        />
      )
    } else {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setRenameMode(true)}
          title={t('categories-manager.rename', 'Rename "{{name}}"', { name })}
          icon={<Icon glyph={Pencil} size="md" />}
        />
      )
    }
  }

  return (
    <div className="Category">
      {!renameMode && <span>{name}</span>}

      {renameMode && (
        <TextInputField
          htmlId={`edit-${name.replace(' ', '-')}`}
          value={newName}
          onChange={(newValue) => setNewName(newValue)}
          label={t('categories-manager.rename', 'Rename "{{name}}"', { name })}
        />
      )}

      {leftButton()}
      {rightButton()}
    </div>
  )
}

function CategoriesManager() {
  const { t } = useTranslation()
  const { customCategories } = useContext(ContextProvider)

  const { setShowCategories } = useContext(LibraryContext)

  const [newCategoryName, setNewCategoryName] = useState('')

  const isCategoryNameEmpty = newCategoryName.trim() === ''

  const removeCategory = (cat: string) => {
    customCategories.removeCategory(cat)
  }

  const addCategory = () => {
    setNewCategoryName('')
    customCategories.addCategory(newCategoryName)
  }

  const renameCategory = (oldName: string, newName: string) => {
    customCategories.renameCategory(oldName, newName)
  }

  const categories = customCategories.listCategories()

  return (
    <Dialog
      showCloseButton
      onClose={() => setShowCategories(false)}
      className="CategoriesManager__Dialog"
    >
      <DialogHeader onClose={() => setShowCategories(false)}>
        <div>{t('categories-manager.title', 'Manage Categories')}</div>
      </DialogHeader>
      <DialogContent>
        {categories.map((cat) => (
          <CategoryItem
            key={cat}
            name={cat}
            removeFunction={removeCategory}
            renameFunction={renameCategory}
          />
        ))}
        {categories.length === 0 &&
          t('categories-manager.no-categories', 'No categories yet.')}
        <hr />
        <TextInputField
          htmlId="new-category-name"
          value={newCategoryName}
          onChange={(newValue) => setNewCategoryName(newValue)}
          placeholder={t(
            'categories-manager.add-placeholder',
            'Add new category'
          )}
          afterInput={
            <Button
              variant="primary"
              onClick={() => addCategory()}
              title={t('categories-manager.add', 'Add')}
              disabled={isCategoryNameEmpty}
              icon={<Icon glyph={Plus} size="md" />}
            />
          }
        />
      </DialogContent>
    </Dialog>
  )
}

export default CategoriesManager
