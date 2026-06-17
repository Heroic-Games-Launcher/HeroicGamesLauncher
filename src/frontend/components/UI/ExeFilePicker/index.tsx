import { useEffect, useCallback, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader
} from 'frontend/components/UI/Dialog'
import CachedImage from 'frontend/components/UI/CachedImage'
import { GameInfo } from 'common/types'
import { useTranslation } from 'react-i18next'
import './index.css'

export default function ExeFilePicker() {
  const [exePath, setExePath] = useState('')
  const [games, setGames] = useState<GameInfo[]>([])
  const { t } = useTranslation()

  useEffect(() => {
    window.api.checkPendingExeFile().then(
      (data) => {
        if (data) {
          setExePath(data.exePath)
          setGames(data.games)
        }
      },
      () => {}
    )

    const removeListener = window.api.handleShowExeFilePicker(
      (_e, path, gameList) => {
        setExePath(path)
        setGames(gameList)
      }
    )
    return () => removeListener()
  }, [])

  const handlePick = useCallback(
    (appName: string) => {
      setExePath('')
      setGames([])
      void window.api.launchWithExeFile(exePath, appName)
    },
    [exePath]
  )

  const handleClose = useCallback(() => {
    setExePath('')
    setGames([])
  }, [])

  const isOpen = exePath.length > 0 && games.length > 0

  return (
    <>
      {isOpen && (
        <Dialog onClose={handleClose} showCloseButton>
          <DialogHeader onClose={handleClose}>
            {t('exeFilePicker.title', 'Select Game Prefix')}
          </DialogHeader>
          <DialogContent>
            <div className="exeFilePicker__path">{exePath}</div>
            <div className="exeFilePicker__list">
              {games.map((g) => (
                <button
                  key={g.app_name}
                  className="exeFilePicker__gameBtn"
                  onClick={() => handlePick(g.app_name)}
                >
                  <CachedImage
                    src={g.art_square}
                    className="exeFilePicker__gameIcon"
                  />
                  <span className="exeFilePicker__gameTitle">{g.title}</span>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
