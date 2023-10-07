import ContextProvider from 'frontend/state/ContextProvider'
import React, { useContext, useEffect, useState } from 'react'
import SettingsContext from '../../SettingsContext'
import { Box, Button, Chip, Divider, Typography } from '@mui/material'
import { TextInputField } from 'frontend/components/UI'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader
} from 'frontend/components/UI/Dialog'

const CategorySettings = () => {
  const { customCategories } = useContext(ContextProvider)
  const { appName } = useContext(SettingsContext)

  const [newCategory, setNewCategory] = useState('')
  const [categoryToDelete, setCategoryToDelete] = useState('')
  const [assignedCategories, setAssignedCategories] = useState<string[]>([])
  const [availableCategories, setAvailableCategories] = useState<string[]>([])

  const { t } = useTranslation()

  const updateCategories = () => {
    setAssignedCategories(
      customCategories
        .listCategories()
        .filter((cat) => customCategories.list[cat].includes(appName))
    )

    setAvailableCategories(
      customCategories
        .listCategories()
        .filter((cat) => !customCategories.list[cat].includes(appName))
    )
  }

  useEffect(() => {
    updateCategories()
  }, [customCategories.list])

  const handleSubmit = () => {
    customCategories.addCategory(newCategory)
    updateCategories()
    setNewCategory('')
  }

  const handleRemoveGameFromCategory = (category: string) => {
    customCategories.removeFromGame(category, appName)
  }

  const handleAddGameToCategory = (category: string) => {
    customCategories.addToGame(category, appName)
    updateCategories()
  }

  const handleShowRemoveCategoryConfirmation = (category: string) => {
    setCategoryToDelete(category)
  }

  const handleRemoveCategory = (category: string) => {
    customCategories.removeCategory(category)
    updateCategories()
    setCategoryToDelete('')
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
      <Typography variant="h4" sx={{ mb: 2 }}>
        {t('category-settings.assigned-categories', 'Assigned categories')}
      </Typography>
      <Box
        sx={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 2 }}
      >
        {assignedCategories.length <= 0 && (
          <Typography
            variant="body1"
            width="max-content"
            color="var(--text-secondary)"
          >
            {t(
              'category-settings.no-assigned-categories',
              'No categories have been assigned to this game'
            )}
          </Typography>
        )}
        {assignedCategories.map((category) => (
          <Chip
            label={category}
            key={category}
            onDelete={() => handleRemoveGameFromCategory(category)}
            sx={{
              backgroundColor: 'var(--brand-primary)',
              ':hover': { backgroundColor: 'var(--primary-hover)' }
            }}
          />
        ))}
      </Box>
      {availableCategories.length > 0 && (
        <>
          <Divider
            sx={{ mt: 4, mb: 4, backgroundColor: 'var(--neutral-04)' }}
          />
          <Typography variant="h4" sx={{ mb: 2 }}>
            {t(
              'category-settings.available-categories',
              'Available categories'
            )}
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: 2
            }}
          >
            {availableCategories.map((category) => (
              <Chip
                label={category}
                key={category}
                onClick={() => handleAddGameToCategory(category)}
                onDelete={() => handleShowRemoveCategoryConfirmation(category)}
                sx={{
                  backgroundColor: 'var(--brand-secondary)',
                  ':hover': { backgroundColor: 'var(--secondary-hover)' }
                }}
              />
            ))}
          </Box>
        </>
      )}
      <Divider sx={{ mt: 4, mb: 4, backgroundColor: 'var(--neutral-04)' }} />
      <Box sx={{ display: 'grid' }}>
        <TextInputField
          label={t('category-settings.new-category', 'New category')}
          htmlId="new-category-input"
          onChange={(e) => {
            setNewCategory(e.target.value)
          }}
          value={newCategory}
        />
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={newCategory.length <= 0}
          sx={{
            placeSelf: 'end',
            ':disabled': { backgroundColor: 'var(--neutral-03)' }
          }}
        >
          {t('category-settings.add-new-category', 'Add new category')}
        </Button>
      </Box>
    </>
  )
}

export default CategorySettings
