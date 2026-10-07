import { useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'
import LibraryContext from '../../LibraryContext'
import ContextProvider from 'frontend/state/ContextProvider'
import { Modal, ModalContent, ModalHeader } from 'frontend/components/UI/Modal'
import { TextInputField } from 'frontend/components/UI'
import Button from 'frontend/components/UI/Button'
import './index.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faAdd,
  faCancel,
  faCheck,
  faPencil,
  faTrash
} from '@fortawesome/free-solid-svg-icons'

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
          size="sm"
          onClick={() => rename()}
          title={t(
            'categories-manager.confirm-rename',
            'Confirm rename of "{{oldName}}" as "{{newName}}"',
            { oldName: name, newName }
          )}
          disabled={isNewNameEmptyOrEqualsOldName}
          icon={<FontAwesomeIcon icon={faCheck} />}
        />
      )
    } else if (removeMode) {
      return (
        <Button
          size="sm"
          variant="destructive"
          onClick={() => remove()}
          title={t(
            'categories-manager.confirm-remove',
            'Confirm removal of "{{name}}"',
            { name }
          )}
          icon={<FontAwesomeIcon icon={faCheck} />}
        />
      )
    } else {
      return (
        <Button
          size="sm"
          variant="destructive"
          onClick={() => setRemoveMode(true)}
          title={t('categories-manager.remove', 'Remove "{{name}}"', { name })}
          icon={<FontAwesomeIcon icon={faTrash} />}
        />
      )
    }
  }

  const rightButton = () => {
    if (renameMode) {
      return (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => cancelEdit()}
          title={t(
            'categories-manager.cancel-rename',
            'Cancel rename of "{{name}}"',
            { name }
          )}
          icon={<FontAwesomeIcon icon={faCancel} />}
        />
      )
    } else if (removeMode) {
      return (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setRemoveMode(false)}
          title={t(
            'categories-manager.cancel-remove',
            'Cancel removal of "{{name}}"',
            { name }
          )}
          icon={<FontAwesomeIcon icon={faCancel} />}
        />
      )
    } else {
      return (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setRenameMode(true)}
          title={t('categories-manager.rename', 'Rename "{{name}}"', { name })}
          icon={<FontAwesomeIcon icon={faPencil} />}
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
    <Modal
      showCloseButton
      size="sm"
      onClose={() => setShowCategories(false)}
      className="CategoriesManager__modal"
    >
      <ModalHeader>
        {t('categories-manager.title', 'Manage Categories')}
      </ModalHeader>
      <ModalContent>
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
              size="sm"
              onClick={() => addCategory()}
              title={t('categories-manager.add', 'Add')}
              disabled={isCategoryNameEmpty}
              icon={<FontAwesomeIcon icon={faAdd} />}
            />
          }
        />
      </ModalContent>
    </Modal>
  )
}

export default CategoriesManager
