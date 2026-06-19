import { useEffect, useCallback, useContext, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader
} from 'frontend/components/UI/Dialog'
import CachedImage from 'frontend/components/UI/CachedImage'
import ContextProvider from 'frontend/state/ContextProvider'
import { useTranslation } from 'react-i18next'
import './index.css'

export default function ExeFilePicker() {
  const [exePath, setExePath] = useState('')
  const [search, setSearch] = useState('')
  const { epic, gog, amazon, zoom, sideloadedLibrary } =
    useContext(ContextProvider)
  const { t } = useTranslation()

  const allGames = [
    ...sideloadedLibrary,
    ...epic.library,
    ...gog.library,
    ...amazon.library,
    ...zoom.library
  ]

  const games = allGames.filter(
    (g) =>
      g.title &&
      !g.browserUrl &&
      !g.is_linux_native &&
      !g.is_mac_native &&
      g.install?.platform?.toLowerCase() !== 'linux'
  )

  useEffect(() => {
    window.api.checkPendingExeFile().then(
      (path) => {
        if (path) {
          setExePath(path)
        }
      },
      () => {}
    )

    const removeListener = window.api.handleShowExeFilePicker(
      (path) => {
        setExePath(path)
      }
    )
    return () => removeListener()
  }, [])

  const filtered = search
    ? games.filter((g) =>
        g.title.toLowerCase().includes(search.toLowerCase())
      )
    : games

  const handlePick = useCallback(
    (appName: string) => {
      setExePath('')
      setSearch('')
      void window.api.launchWithExeFile(exePath, appName)
    },
    [exePath]
  )

  const handleClose = useCallback(() => {
    setExePath('')
    setSearch('')
  }, [])

  const isOpen = exePath.length > 0 && games.length > 0

  return (
    <>
      {isOpen && (
        <Dialog className="exeFilePicker" onClose={handleClose} showCloseButton>
          <DialogHeader onClose={handleClose}>
            {t('exeFilePicker.title', 'Select Game Prefix')}
          </DialogHeader>
          <DialogContent>
            <div className="exeFilePicker__path">{exePath}</div>
            <input
              className="exeFilePicker__search"
              placeholder={t('exeFilePicker.search', 'Search games...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="exeFilePicker__list">
              {filtered.map((g) => (
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
