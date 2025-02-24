import React, { useEffect, useState } from 'react'
import { SelectField, TextInputField } from 'frontend/components/UI'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent } from 'frontend/components/UI/Dialog'

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
        <Dialog
          showCloseButton={false}
          onClose={() => setShowBranchPasswordInput(false)}
        >
          <DialogContent className="ModifyInstall__branchPassword">
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
            <div className="controls">
              <button
                className="button is-danger"
                onClick={() => {
                  setShowBranchPasswordInput(false)
                  setBranchPassword(savedBranchPassword)
                }}
              >
                {tr('button.cancel', 'Cancel')}
              </button>
              <button
                className="button is-success"
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
              </button>
            </div>
          </DialogContent>
        </Dialog>
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
          <option value={String(branch)} key={String(branch)}>
            {branch || t('game.branch.disabled', 'Disabled')}
          </option>
        ))}
        <option value={'heroic-update-passwordOption'}>
          {t(
            'game.branch.setPrivateBranchPassword',
            'Set private channel password'
          )}
        </option>
      </SelectField>
    </div>
  )
}
