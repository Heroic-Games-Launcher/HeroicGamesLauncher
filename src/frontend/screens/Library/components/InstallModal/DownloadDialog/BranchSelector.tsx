import { useEffect, useState } from 'react'
import { SelectField, TextInputField } from 'frontend/components/UI'
import { useTranslation } from 'react-i18next'
import { Modal, ModalContent, ModalFooter } from 'frontend/components/UI/Modal'
import Button from 'frontend/components/UI/Button'
import { MenuItem } from '@mui/material'

interface BranchSelectorProps {
  appName: string
  branches: Array<string | null>
  branch?: string
  savedBranchPassword: string
  setBranch: (branch?: string) => void
  onPasswordChange: (password: string) => void
}

export default function BranchSelector({
  appName,
  branches,
  branch,
  savedBranchPassword,
  setBranch,
  onPasswordChange
}: BranchSelectorProps) {
  const { t } = useTranslation('gamepage')
  const { t: tr } = useTranslation()

  const [showBranchPasswordInput, setShowBranchPasswordInput] =
    useState<boolean>(false)
  const [branchPassword, setBranchPassword] =
    useState<string>(savedBranchPassword)

  useEffect(() => {
    setBranchPassword(savedBranchPassword)
  }, [savedBranchPassword])

  return (
    <div>
      {showBranchPasswordInput && (
        <Modal size="sm" onClose={() => setShowBranchPasswordInput(false)}>
          <ModalContent className="ModifyInstall__branchPassword">
            <TextInputField
              htmlId="private-branch-password-input"
              value={branchPassword}
              type={'password'}
              onChange={(newValue) => setBranchPassword(newValue)}
              placeholder={t(
                'game.branch.password',
                'Set private channel password'
              )}
            />
          </ModalContent>
          <ModalFooter>
            <Button
              onClick={() => {
                setShowBranchPasswordInput(false)
                window.api
                  .setPrivateBranchPassword(appName, branchPassword)
                  .finally(() => {
                    onPasswordChange(branchPassword)
                  })
              }}
            >
              {tr('box.ok', 'OK')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setShowBranchPasswordInput(false)
                setBranchPassword(savedBranchPassword)
              }}
            >
              {tr('button.cancel', 'Cancel')}
            </Button>
          </ModalFooter>
        </Modal>
      )}

      <SelectField
        label={t('game.branch.select', 'Select beta channel')}
        htmlId="modify-branches"
        value={String(branch)}
        onChange={(e) => {
          const value = e.target.value
          if (value === 'null') {
            setBranch()
          } else if (value === 'heroic-update-passwordOption') {
            setShowBranchPasswordInput(true)
          } else {
            setBranch(e.target.value)
          }
        }}
      >
        {branches.map((branch) => (
          <MenuItem value={String(branch)} key={String(branch)}>
            {branch || t('game.branch.disabled', 'Disabled')}
          </MenuItem>
        ))}
        <MenuItem value={'heroic-update-passwordOption'}>
          {t(
            'game.branch.setPrivateBranchPassword',
            'Set private channel password'
          )}
        </MenuItem>
      </SelectField>
    </div>
  )
}
