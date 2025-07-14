import './index.scss'
import ContextProvider from 'frontend/state/ContextProvider'
import React, { useContext, useEffect, useMemo, useState } from 'react'
import SettingsContext from '../../SettingsContext'
import { Box, Button, Divider, IconButton } from '@mui/material'
import { TextInputField, ToggleSwitch } from 'frontend/components/UI'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader
} from 'frontend/components/UI/Dialog'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'

const CategorySettings = () => {
  const {
    customCategories,
    currentCustomCategories,
    setCurrentCustomCategories
  } = useContext(ContextProvider)
  const { appName, runner } = useContext(SettingsContext)

  const [newCategory, setNewCategory] = useState('')
  const [categoryToDelete, setCategoryToDelete] = useState('')
  const [assignedCategories, setAssignedCategories] = useState<string[]>([])

  const appNameWithRunner = useMemo(
    () => `${appName}_${runner}`,
    [appName, runner]
  )

  const { t } = useTranslation()

  const updateCategories = () => {
    setAssignedCategories(
      customCategories
        .listCategories()
        .filter((cat) => customCategories.list[cat].includes(appNameWithRunner))
    )
  }

  useEffect(() => {
    updateCategories()
  }, [customCategories.list])

  const isCategorySubmissionDisabled = useMemo(
    () =>
      newCategory.trim().length <= 0 ||
      customCategories.listCategories().includes(newCategory.trim()),
    [newCategory, customCategories.listCategories]
  )

  const handleSubmit = () => {
    const formattedCategory = newCategory.trim()
    customCategories.addCategory(formattedCategory)
    handleAddGameToCategory(formattedCategory)
    setNewCategory('')
  }

  const handleRemoveGameFromCategory = (category: string) => {
    customCategories.removeFromGame(category, appNameWithRunner)
  }

  const handleAddGameToCategory = (category: string) => {
    customCategories.addToGame(category, appNameWithRunner)
    updateCategories()
  }

  const handleShowRemoveCategoryConfirmation = (category: string) => {
    setCategoryToDelete(category)
  }

  const handleRemoveCategory = (category: string) => {
    if (
      currentCustomCategories.length === 1 &&
      currentCustomCategories[0] === category
    )
      setCurrentCustomCategories([])
    customCategories.removeCategory(category)
    updateCategories()
    setCategoryToDelete('')
  }

  const handleToggleSwitchChange = (category: string) => {
    if (!assignedCategories.includes(category))
      handleAddGameToCategory(category)
    else handleRemoveGameFromCategory(category)
  }

  return (
    <>
      {categoryToDelete.length > 0 && (
        <Dialog showCloseButton onClose={() => setCategoryToDelete('')}>
          <DialogHeader onClose={() => setCategoryToDelete('')}>
            {t('category-settings.warning', 'Warning')}
          </DialogHeader>
          <DialogContent>
            {t(
              'category-settings.delete-question',
              `Proceeding will permanently remove this category and unassign it
            from all games. Continue?`
            )}
            <Box sx={{ display: 'flex', gap: 2, placeContent: 'end', mt: 4 }}>
              <Button
                variant="contained"
                color="error"
                onClick={() => handleRemoveCategory(categoryToDelete)}
              >
                {t('category-settings.remove-category', 'Remove Category')}
              </Button>
              <Button
                variant="contained"
                onClick={() => setCategoryToDelete('')}
              >
                {t('category-settings.cancel', 'Cancel')}
              </Button>
            </Box>
          </DialogContent>
        </Dialog>
      )}
      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextInputField
          label={t('category-settings.new-category', 'New category')}
          htmlId="new-category-input"
          onChange={(newValue) => {
            setNewCategory(newValue)
          }}
          value={newCategory}
          maxLength={33}
          extraClass="NewCategoryInput"
        />
        <Button
          variant="contained"
          size="small"
          onClick={handleSubmit}
          disabled={isCategorySubmissionDisabled}
          sx={{
            placeSelf: 'end',
            ':disabled': { backgroundColor: 'var(--neutral-03)' }
          }}
        >
          {t('category-settings.add-new-category', 'Add new category')}
        </Button>
      </Box>
      <Divider sx={{ mt: 4, mb: 4, backgroundColor: 'var(--neutral-04)' }} />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 2,
          paddingBottom: 4
        }}
      >
        {customCategories.listCategories().map((category) => (
          <Box key={category} sx={{ display: 'flex', gap: 2 }}>
            <ToggleSwitch
              title={category}
              htmlId={`category-checkbox-${category}`}
              value={assignedCategories.includes(category)}
              handleChange={() => {
                handleToggleSwitchChange(category)
              }}
            />
            <IconButton
              color="error"
              sx={{ padding: 2 }}
              onClick={() => {
                handleShowRemoveCategoryConfirmation(category)
              }}
            >
              <DeleteForeverIcon />
            </IconButton>
          </Box>
        ))}
      </Box>
    </>
  )
}

export default CategorySettings
