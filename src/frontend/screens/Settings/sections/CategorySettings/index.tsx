import ContextProvider from 'frontend/state/ContextProvider'
import React, { useContext, useEffect, useState } from 'react'
import SettingsContext from '../../SettingsContext'
import { Box, Button, Chip, Divider, Typography } from '@mui/material'
import { TextInputField } from 'frontend/components/UI'

const CategorySettings = () => {
  const { customCategories } = useContext(ContextProvider)
  const { appName } = useContext(SettingsContext)

  const [newCategory, setNewCategory] = useState('')
  const [assignedCategories, setAssignedCategories] = useState<string[]>([])
  const [availableCategories, setAvailableCategories] = useState<string[]>([])

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
    customCategories.remove(category, appName)
  }

  const handleAddGameToCategory = (category: string) => {
    customCategories.add(category, appName)
    updateCategories()
  }

  const handleRemoveCategory = (category: string) => {
    customCategories.removeCategory(category)
    updateCategories()
  }

  return (
    <>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Assigned categories
      </Typography>
      <Box
        sx={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 2 }}
      >
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
            Available categories
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
                onDelete={() => handleRemoveCategory(category)}
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
          label="New category"
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
          Add new category
        </Button>
      </Box>
    </>
  )
}

export default CategorySettings
