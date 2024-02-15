import React, { useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'
import LibraryContext from '../../LibraryContext'
import ContextProvider from 'frontend/state/ContextProvider'
import { Dialog, DialogHeader } from 'frontend/components/UI/Dialog'
import { DialogContent } from '@mui/material'
import { TextInputField } from 'frontend/components/UI'
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
        <button
          className="button is-primary"
          onClick={() => rename()}
          title={t('categories-manager.save-rename', 'Save rename')}
        >
          <FontAwesomeIcon icon={faCheck} />
        </button>
      )
    } else if (removeMode) {
      return (
        <button
          className="button is-danger"
          onClick={() => remove()}
          title={t('categories-manager.confirm-remove', 'Confirm removal')}
        >
          <FontAwesomeIcon icon={faCheck} />
        </button>
      )
    } else {
      return (
        <button
          className="button is-danger"
          onClick={() => setRemoveMode(true)}
          title={t('categories-manager.remove', 'Remove')}
        >
          <FontAwesomeIcon icon={faTrash} />
        </button>
      )
    }
  }

  const rightButton = () => {
    if (renameMode) {
      return (
        <button
          className="button is-secondary"
          onClick={() => cancelEdit()}
          title={t('categories-manager.cancel-rename', 'Cancel rename')}
        >
          <FontAwesomeIcon icon={faCancel} />
        </button>
      )
    } else if (removeMode) {
      return (
        <button
          className="button is-secondary"
          onClick={() => setRemoveMode(false)}
          title={t('categories-manager.cancel-remove', 'Cancel removal')}
        >
          <FontAwesomeIcon icon={faCancel} />
        </button>
      )
    } else {
      return (
        <button
          className="button is-secondary"
          onClick={() => setRenameMode(true)}
          title={t('categories-manager.rename', 'Rename')}
        >
          <FontAwesomeIcon icon={faPencil} />
        </button>
      )
    }
  }

  return (
    <div className="Category">
      {!renameMode && <span>{name}</span>}

      {renameMode && (
        <TextInputField
          htmlId={`edit-${name}`}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
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
        {customCategories.listCategories().map((cat) => (
          <CategoryItem
            key={cat}
            name={cat}
            removeFunction={removeCategory}
            renameFunction={renameCategory}
          />
        ))}
        <hr />
        <TextInputField
          htmlId="new-category-name"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder={t(
            'categories-manager.add-placeholder',
            'Add new category'
          )}
          afterInput={
            <button
              className="button"
              onClick={() => addCategory()}
              title={t('categories-manager.add', 'Add')}
            >
              <FontAwesomeIcon icon={faAdd} />
            </button>
          }
        />
      </DialogContent>
    </Dialog>
  )
}

export default CategoriesManager
