import { useContext, useEffect, useState } from 'react'
import ContextProvider from '../../../state/ContextProvider'
import { useTranslation } from 'react-i18next'

export const SHOW_EXTERNAL_LINK_DIALOG_STORAGE_KEY = 'show_external_link_dialog'

export default function ExternalLinkDialog() {
  const { t } = useTranslation()
  const [dontAskAgain, setDontAskAgain] = useState(false)
  const {
    externalLinkDialogOptions,
    handleExternalLinkDialog,
    showDialogModal
  } = useContext(ContextProvider)

  useEffect(() => {
    if (externalLinkDialogOptions.showDialog) {
      showDialogModal({
        title: t('externalLink.title', 'External Link'),
        message: t(
          'externalLink.warning',
          'You are about to open an external link.'
        ),
        checkboxes: [
          {
            id: 'externalLinkDialogDontAskAgain',
            label: t('externalLink.dontAskAgain', "Don't ask again"),
            value: dontAskAgain,
            onChange: (val) => setDontAskAgain(val)
          }
        ],
        buttons: [
          {
            text: t('button.continue', 'Continue'),
            onClick: () => {
              if (dontAskAgain) {
                localStorage.setItem(
                  SHOW_EXTERNAL_LINK_DIALOG_STORAGE_KEY,
                  'false'
                )
              }
              externalLinkDialogOptions.linkCallback?.()
              handleExternalLinkDialog({ showDialog: false })
            }
          },
          {
            text: t('button.cancel', 'Cancel'),
            onClick: () => handleExternalLinkDialog({ showDialog: false })
          }
        ],
        onClose: () => handleExternalLinkDialog({ showDialog: false })
      })
    }
  }, [
    externalLinkDialogOptions.showDialog,
    dontAskAgain,
    externalLinkDialogOptions.linkCallback,
    handleExternalLinkDialog,
    showDialogModal,
    t,
    externalLinkDialogOptions
  ])

  useEffect(() => {
    if (!externalLinkDialogOptions.showDialog) {
      setDontAskAgain(false)
    }
  }, [externalLinkDialogOptions.showDialog, externalLinkDialogOptions])

  return null
}
