import './index.css'
import { faSpinner, faSearch } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { GameInfo } from 'common/types'
import {
  CachedImage,
  TextInputField,
  SteamGridDBPicker,
  WarningMessage
} from 'frontend/components/UI'
import TextInputWithIconField from 'frontend/components/UI/TextInputWithIconField'
import { DialogContent, DialogFooter } from 'frontend/components/UI/Dialog'
import { useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import fallbackImage from 'frontend/assets/heroic_card.jpg'
import classNames from 'classnames'
import Folder from '@mui/icons-material/Folder'

type Props = {
  gameInfo: GameInfo
  backdropClick: () => void
}

type SgdbTarget = 'cover' | 'square' | null

export default function EditGameDialog({ gameInfo, backdropClick }: Props) {
  const { t } = useTranslation('gamepage')
  const [title, setTitle] = useState(
    gameInfo.overrides?.title || gameInfo.title
  )
  const [artCover, setArtCover] = useState(
    gameInfo.overrides?.art_cover || gameInfo.art_cover
  )
  const [artSquare, setArtSquare] = useState(
    gameInfo.overrides?.art_square || gameInfo.art_square
  )
  const [saving, setSaving] = useState(false)
  const [hasSgdbKey, setHasSgdbKey] = useState(false)
  const [sgdbTarget, setSgdbTarget] = useState<SgdbTarget>(null)

  useEffect(() => {
    window.api.steamgriddb.hasApiKey().then(setHasSgdbKey)
  }, [])

  const handleSave = () => {
    setSaving(true)
    // Drop fields that match the original game info — the backend deletes
    // the override entry when all three are empty, which is what we want
    // after the user resets.
    window.api.setGameMetadataOverride({
      appName: gameInfo.app_name,
      title: title === gameInfo.title ? '' : title,
      art_cover: artCover === gameInfo.art_cover ? '' : artCover,
      art_square: artSquare === gameInfo.art_square ? '' : artSquare
    })
    setSaving(false)
    backdropClick()
  }

  const handleReset = () => {
    // Restore the form to the game's original values. Saving from this state
    // sends empty fields to the backend, which removes the override entry.
    setTitle(gameInfo.title)
    setArtCover('')
    setArtSquare('')
  }

  const hasOverride = Boolean(gameInfo.overrides)

  async function handleSelectLocalImage(target: 'cover' | 'square') {
    const path = await window.api.openDialog({
      buttonLabel: t('box.select.button', 'Select'),
      properties: ['openFile'],
      title: t('box.select.image', 'Select Image'),
      filters: [
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] },
        { name: 'All', extensions: ['*'] }
      ]
    })

    if (!path) return

    // Copy into our data dir so the override survives the original being moved
    // or deleted, and so Flatpak portal-mounted paths don't leak into state.
    const localPath = await window.api.copyImageToOverrides({
      srcPath: path,
      appName: gameInfo.app_name,
      kind: target
    })
    const finalUrl = localPath ? `file://${localPath}` : `file://${path}`

    if (target === 'cover') setArtCover(finalUrl)
    else setArtSquare(finalUrl)
  }

  const openSgdbPicker = (target: 'cover' | 'square') => {
    if (!hasSgdbKey) return
    setSgdbTarget(target)
  }

  return (
    <div className="EditGameDialog">
      <DialogContent>
        <div className="editGameGrid">
          <div className="editGameForm">
            <TextInputField
              label={t('sideload.info.title', 'Game/App Title')}
              placeholder={t(
                'sideload.placeholder.title',
                'Add a title to your Game/App'
              )}
              onChange={setTitle}
              htmlId="edit-game-title"
              value={title}
              maxLength={40}
            />
            <details className="advancedFields">
              <summary>{t('edit-game.advanced', 'Advanced')}</summary>
              <TextInputWithIconField
                label={t('edit-game.info.cover', 'Cover Image')}
                placeholder={t(
                  'sideload.placeholder.image',
                  'Paste an URL of an Image or select one from your computer'
                )}
                onChange={setArtCover}
                htmlId="edit-game-cover"
                value={artCover}
                icon={<Folder />}
                onIconClick={() => handleSelectLocalImage('cover')}
              />
              <TextInputWithIconField
                label={t('edit-game.info.square', 'Square Image')}
                placeholder={t(
                  'sideload.placeholder.image',
                  'Paste an URL of an Image or select one from your computer'
                )}
                onChange={setArtSquare}
                htmlId="edit-game-square"
                value={artSquare}
                icon={<Folder />}
                onIconClick={() => handleSelectLocalImage('square')}
              />
            </details>
            {!hasSgdbKey && (
              <WarningMessage>
                <Trans
                  i18nKey="edit-game.sgdb.no-key"
                  ns="gamepage"
                  defaults="To search SteamGridDB for cover art, add an API key in <link>Settings → Advanced</link>."
                  components={{
                    link: <NavLink to="/settings/app/advanced" />
                  }}
                />
              </WarningMessage>
            )}
            {sgdbTarget && (
              <SteamGridDBPicker
                initialTitle={title}
                mode={sgdbTarget === 'cover' ? 'heroes' : 'grids'}
                onClose={() => setSgdbTarget(null)}
                onSelect={(url: string) => {
                  if (sgdbTarget === 'cover') setArtCover(url)
                  else setArtSquare(url)
                  setSgdbTarget(null)
                }}
              />
            )}
          </div>
          <div className="imageIcons">
            <div className="previewItem">
              <span className="previewLabel">
                {t('edit-game.cover', 'Cover Art')}
              </span>
              <div
                className={classNames('appImageContainer', { hasSgdbKey })}
                onClick={() => openSgdbPicker('cover')}
              >
                <CachedImage
                  className={classNames('appImage')}
                  src={artCover || gameInfo.art_cover || fallbackImage}
                />
                {hasSgdbKey && (
                  <div className="imageHoverOverlay">
                    <FontAwesomeIcon icon={faSearch} size="3x" />
                  </div>
                )}
              </div>
            </div>
            <div className="previewItem">
              <span className="previewLabel">
                {t('edit-game.square', 'Square Art')}
              </span>
              <div
                className={classNames('appImageContainer', { hasSgdbKey })}
                onClick={() => openSgdbPicker('square')}
              >
                <CachedImage
                  className={classNames('appImage square')}
                  src={
                    artSquare ||
                    artCover ||
                    gameInfo.art_square ||
                    gameInfo.art_cover ||
                    fallbackImage
                  }
                />
                {hasSgdbKey && (
                  <div className="imageHoverOverlay">
                    <FontAwesomeIcon icon={faSearch} size="3x" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
      <DialogFooter>
        {hasOverride && (
          <button
            type="button"
            onClick={handleReset}
            className="button is-secondary"
            disabled={saving}
          >
            {t('edit-game.reset', 'Reset to default')}
          </button>
        )}
        <button
          onClick={handleSave}
          className="button is-success"
          disabled={saving}
        >
          {saving && <FontAwesomeIcon icon={faSpinner} spin />}
          {!saving && t('button.finish', 'Finish')}
        </button>
      </DialogFooter>
    </div>
  )
}
