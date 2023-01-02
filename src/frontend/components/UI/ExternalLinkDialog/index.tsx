import React, { useContext, useState } from 'react'
import { Dialog, DialogContent, DialogFooter } from '../Dialog'
import ContextProvider from '../../../state/ContextProvider'
import ToggleSwitch from '../ToggleSwitch'
import { useTranslation } from 'react-i18next'

export const SHOW_EXTERNAL_LINK_DIALOG_STORAGE_KEY = 'show_external_link_dialog'

export default function ExternalLinkDialog() {
  const { t } = useTranslation()
  const [showDialog, setShowDialog] = useState(false)
  const { externalLinkDialogOptions, handleExternalLinkDialog } =
    useContext(ContextProvider)

  function onClose() {
    handleExternalLinkDialog({ showDialog: false, linkCallback: undefined })
  }

  function onContinue() {
    if (externalLinkDialogOptions.linkCallback !== undefined)
      externalLinkDialogOptions.linkCallback()
    onClose()
  }

  function onHideDialogChange() {
    setShowDialog(!showDialog)
    localStorage.setItem(
      SHOW_EXTERNAL_LINK_DIALOG_STORAGE_KEY,
      showDialog.toString()
    )
  }

  return externalLinkDialogOptions.showDialog ? (
    <Dialog onClose={onClose} showCloseButton={false}>
      <DialogContent>
        {t('externalLink.warning', 'You are about to open an external link.')}
        <br></br>
        <br></br>
        <ToggleSwitch
          htmlId="externalLinkDialog"
          handleChange={onHideDialogChange}
          value={showDialog}
          title={t('externalLink.dontAskAgain', "Don't ask again")}
        ></ToggleSwitch>
      </DialogContent>
      <DialogFooter>
        <button onClick={onContinue} className={`button is-primary`}>
          {t('button.continue', 'Continue')}
        </button>
        <button className={`button is-secondary`} onClick={onClose}>
          {t('button.cancel', 'Cancel')}
        </button>
      </DialogFooter>
    </Dialog>
  ) : null
}
