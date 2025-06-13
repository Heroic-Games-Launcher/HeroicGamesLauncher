import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Typography } from '@mui/material'
import { Warning as WarningIcon } from '@mui/icons-material'

import { Dialog, DialogContent, DialogFooter, DialogHeader } from '../Dialog'
import PathSelectionBox from '../PathSelectionBox'
import TextInputField from '../TextInputField'

interface Props {
  closed: boolean
  close: () => void
  onUserCancel?: () => void
}

export default React.memo(function LibraryCreationDialog({
  closed,
  close,
  onUserCancel
}: Props) {
  const { t } = useTranslation()
  const [path, setPath] = useState<string>('')
  const [name, setName] = useState<string>('')
  const [failedToAdd, setFailedToAdd] = useState(false)

  const onClose = useCallback(() => {
    close()
    if (onUserCancel) onUserCancel()
    setPath('')
    setName('')
    setFailedToAdd(false)
  }, [setPath, setName])

  const setPathAndUpdateName = useCallback(
    (newPath: string) => {
      setPath(newPath)
      const folderName = newPath.split(/[/\\]/).at(-1)
      if (folderName) setName(folderName)
    },
    [setPath, setName]
  )

  const addLibrary = useCallback(async () => {
    const wasAdded = await window.api.libraries.add(path)
    if (wasAdded) {
      await window.api.libraries.rename(path, name)
      close()
    } else setFailedToAdd(true)
  }, [path, name])

  if (closed) return <></>

  return (
    <Dialog onClose={onClose} showCloseButton={true}>
      <DialogHeader>
        {t('settings.libraries.addDialog.header', 'Add Library')}
      </DialogHeader>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2}>
          <PathSelectionBox
            htmlId={'library-path'}
            type={'directory'}
            label={t('settings.libraries.addDialog.pathLabel', 'Library path')}
            onPathChange={setPathAndUpdateName}
            path={path}
            pathDialogTitle={t(
              'settings.libraries.addDialog.pathDialogTitle',
              'Select path for library'
            )}
          />
          <TextInputField
            htmlId={'library-name'}
            label={t('settings.libraries.addDialog.name', 'Library name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          ></TextInputField>
        </Box>

        {failedToAdd && (
          <Box display="flex" alignItems="center" mt={2}>
            <WarningIcon />
            <Typography>
              {t(
                'settings.libraries.addDialog.failMessage',
                'Failed to add library. Make sure the provided path is writable'
              )}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogFooter>
        <button
          onClick={addLibrary}
          disabled={!name || !path}
          className={'button is-primary'}
        >
          {t('settings.libraries.addDialog.addButtonLabel', 'Add')}
        </button>
      </DialogFooter>
    </Dialog>
  )
})
