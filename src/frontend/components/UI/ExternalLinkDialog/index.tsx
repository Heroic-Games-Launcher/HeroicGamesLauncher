import { useContext, useState } from 'react'
import { Modal, ModalContent, ModalFooter } from '../Modal'
import Button from '../Button'
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
    setShowDialog(false)
    handleExternalLinkDialog({ showDialog: false, linkCallback: undefined })
  }

  function onContinue() {
    onHideDialogChange()
    if (externalLinkDialogOptions.linkCallback !== undefined)
      externalLinkDialogOptions.linkCallback()
    onClose()
  }

  function onHideDialogChange() {
    localStorage.setItem(
      SHOW_EXTERNAL_LINK_DIALOG_STORAGE_KEY,
      showDialog ? 'false' : 'true'
    )
  }

  return externalLinkDialogOptions.showDialog ? (
    <Modal onClose={onClose} size="sm">
      <ModalContent>
        {t('externalLink.warning', 'You are about to open an external link.')}
        <br></br>
        <br></br>
        <ToggleSwitch
          htmlId="externalLinkDialog"
          handleChange={() => setShowDialog(!showDialog)}
          value={showDialog}
          title={t('externalLink.dontAskAgain', "Don't ask again")}
        ></ToggleSwitch>
      </ModalContent>
      <ModalFooter>
        <Button onClick={onContinue}>{t('button.continue', 'Continue')}</Button>
        <Button variant="secondary" onClick={onClose}>
          {t('button.cancel', 'Cancel')}
        </Button>
      </ModalFooter>
    </Modal>
  ) : null
}
