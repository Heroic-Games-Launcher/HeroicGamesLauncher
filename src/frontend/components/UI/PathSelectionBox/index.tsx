import TextInputWithIconField from '../TextInputWithIconField'
import Backspace from '@mui/icons-material/Backspace'
import Folder from '@mui/icons-material/Folder'
import React, { ReactNode, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { FileFilter } from 'electron'

interface Props {
  htmlId: string
  // Whether the selected item should be a directory or a file
  type: 'file' | 'directory'
  // Called when a new path is selected. Note that this function also has to
  // store the new path (for example with a `useState`)
  onPathChange: (path: string) => void
  // The path to display
  path: string
  // The "placeholder" attribute of the <input> element
  placeholder?: string
  // The window title of the file/directory chooser
  pathDialogTitle: string
  pathDialogDefaultPath?: string
  pathDialogFilters?: FileFilter[]
  // Dictates if the user can manually edit the path
  canEditPath?: boolean
  // Disables the Backspace/Delete button, always opening the file picker
  // when the user clicks the icon
  noDeleteButton?: boolean
  label?: string
  afterInput?: ReactNode
  disabled?: boolean
}

const PathSelectionBox = ({
  onPathChange,
  path,
  placeholder,
  pathDialogTitle,
  pathDialogDefaultPath,
  pathDialogFilters,
  type,
  canEditPath = true,
  noDeleteButton = false,
  htmlId,
  label,
  afterInput,
  disabled = false
}: Props) => {
  const { t } = useTranslation()
  // We only send `onPathChange` updates when the user is done editing, so we
  // have to store the partially-edited path *somewhere*
  const [tmpPath, setTmpPath] = useState(path)

  useEffect(() => setTmpPath(path), [path])

  function handleIconClick() {
    if (!noDeleteButton && path) {
      // "Backspace" icon was pressed
      onPathChange('')
      setTmpPath(path)
      return
    }

    // "Folder" icon was pressed
    window.api
      .openDialog({
        buttonLabel: t('box.choose'),
        properties: type === 'directory' ? ['openDirectory'] : ['openFile'],
        title: pathDialogTitle,
        filters: pathDialogFilters,
        defaultPath: pathDialogDefaultPath
      })
      .then((selectedPath) => {
        if (selectedPath) {
          onPathChange(selectedPath)
          setTmpPath(path)
        }
      })
  }

  return (
    <TextInputWithIconField
      value={tmpPath}
      onChange={(newVal) => setTmpPath(newVal)}
      onBlur={(e) => onPathChange(e.target.value)}
      onIconClick={handleIconClick}
      placeholder={placeholder}
      icon={!noDeleteButton && path ? <Backspace /> : <Folder />}
      disabled={!canEditPath || disabled}
      htmlId={htmlId}
      label={label}
      afterInput={afterInput}
    />
  )
}

export default PathSelectionBox
