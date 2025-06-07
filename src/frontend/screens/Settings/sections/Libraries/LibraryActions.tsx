import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, DialogActions } from '@mui/material'
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Warning as WarningIcon
} from '@mui/icons-material'
import { useTranslation } from 'react-i18next'

import { Dialog, DialogHeader } from 'frontend/components/UI/Dialog'
import TextInputField from 'frontend/components/UI/TextInputField'

import type { LibraryInfo } from 'backend/libraries/types'

interface RenameDialogProps {
  closed: boolean
  close: () => void
  path: string
  info: LibraryInfo
}

const RenameDialog = React.memo(function RenameDialog({
  closed,
  close,
  path,
  info
}: RenameDialogProps) {
  const { t } = useTranslation()
  const [tempName, setTempName] = useState(info.name)

  useEffect(() => {
    setTempName(info.name)
  }, [info.name])

  const changeLibraryName = useCallback(async () => {
    const success = await window.api.libraries.rename(path, tempName)
    if (success) close()
  }, [path, tempName, close])

  if (closed) return <></>

  return (
    <Dialog showCloseButton={true} onClose={close}>
      <DialogHeader>
        {t('settings.libraries.renameDialog.title', 'Rename library')}
      </DialogHeader>
      <Box>
        <TextInputField
          htmlId={'library-name'}
          label={t(
            'settings.libraries.renameDialog.nameLabel',
            'New library name'
          )}
          value={tempName}
          onChange={(e) => setTempName(e.target.value)}
        ></TextInputField>
      </Box>
      <DialogActions>
        <button className={'button is-primary'} onClick={changeLibraryName}>
          {t('settings.libraries.renameDialog.saveButton', 'Save')}
        </button>
        <button className={'button is-tertiary'} onClick={close}>
          {t('settings.libraries.renameDialog.cancelButton', 'Cancel')}
        </button>
      </DialogActions>
    </Dialog>
  )
})

interface DeleteDialogProps {
  closed: boolean
  close: () => void
  path: string
  info: LibraryInfo | false
  onDelete?: () => void
}

const DeleteDialog = React.memo(function DeleteDialog({
  closed,
  close,
  path,
  info,
  onDelete
}: DeleteDialogProps) {
  const { t } = useTranslation()

  const noInfoWarning = useMemo(() => {
    if (!info)
      return (
        <Box display="flex" alignItems="center" gap={1}>
          <WarningIcon />
          {t(
            'settings.libraries.deleteDialog.noInfoWarning',
            'This library could not be loaded. It might be located in an inaccessible location (removable drive?) or has otherwise become corrupted. Deleting this library will not erase any data, but deleting and re-adding it will likely not resolve this issue.'
          )}
        </Box>
      )
    return <></>
  }, [info])

  const deleteLibrary = useCallback(async () => {
    const success = await window.api.libraries.delete(path)
    if (success) {
      close()
      if (onDelete) onDelete()
    }
  }, [path, close, onDelete])

  const [cantDeleteTitle, cantDeleteMessage] = useMemo(():
    | [string, string]
    | [undefined, undefined] => {
    if (info && !info.removable)
      return [
        t(
          'settings.libraries.deleteDialog.cantDeleteDefaultLibraryHeader',
          "Library isn't removable"
        ),
        t(
          'settings.libraries.deleteDialog.cantDeleteDefaultLibraryMessage',
          'This library was automatically added by Heroic. It cannot be deleted.'
        )
      ]

    if (info && info.games.length)
      return [
        t(
          'settings.libraries.deleteDialog.cantDeleteNonEmptyLibraryHeader',
          'Library not empty'
        ),
        t(
          'settings.libraries.deleteDialog.cantDeleteNonEmptyLibraryMessage',
          'This library cannot be deleted as it still contains {{numGames}} game(s). Move them to other libraries or uninstall them first.',
          { numGames: info.games.length }
        )
      ]

    return [undefined, undefined]
  }, [info])

  if (closed) return <></>

  if (cantDeleteTitle && cantDeleteMessage)
    return (
      <Dialog showCloseButton={true} onClose={close}>
        <DialogHeader>{cantDeleteTitle}</DialogHeader>
        {cantDeleteMessage}
      </Dialog>
    )

  return (
    <Dialog showCloseButton={true} onClose={close}>
      <DialogHeader>
        {t('settings.libraries.deleteDialog.title', 'Delete library')}
      </DialogHeader>
      <Box display="flex" flexDirection="column" gap={1}>
        {noInfoWarning}
        {t(
          'settings.libraries.deleteDialog.content',
          'Are you sure you want to delete the library "{{libraryName}}"?',
          {
            libraryName: info ? info.name : path
          }
        )}
      </Box>
      <DialogActions>
        <button className={'button is-danger'} onClick={deleteLibrary}>
          {t('settings.libraries.deleteDialog.confirmButton', 'Yes')}
        </button>
        <button className={'button is-primary'} onClick={close}>
          {t('settings.libraries.deleteDialog.cancelButton', 'No')}
        </button>
      </DialogActions>
    </Dialog>
  )
})

interface Props {
  path: string
  info: LibraryInfo | false
  resetLibrarySelector?: () => void
}

export default React.memo(function LibraryActions({
  path,
  info,
  resetLibrarySelector
}: Props) {
  const { t } = useTranslation()

  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  return (
    <>
      <Box display="flex" width="100%" justifyContent="space-between" gap={1}>
        <button
          className={'button is-secondary'}
          disabled={!info}
          style={{ width: '50%' }}
          onClick={() => setShowRenameDialog(true)}
        >
          <EditIcon />
          {t('settings.libraries.renameButton', 'Rename')}
        </button>
        <button
          className={'button is-danger'}
          style={{ width: '50%' }}
          onClick={() => setShowDeleteDialog(true)}
        >
          <DeleteIcon />
          {t('settings.libraries.removeButton', 'Remove')}
        </button>
      </Box>
      {info && (
        <RenameDialog
          closed={!showRenameDialog}
          close={() => setShowRenameDialog(false)}
          path={path}
          info={info}
        />
      )}
      <DeleteDialog
        closed={!showDeleteDialog}
        close={() => setShowDeleteDialog(false)}
        path={path}
        info={info}
        onDelete={resetLibrarySelector}
      />
    </>
  )
})
