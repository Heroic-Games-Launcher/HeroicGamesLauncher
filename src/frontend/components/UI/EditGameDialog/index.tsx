import './index.css'
import { faSearch } from '@fortawesome/free-solid-svg-icons'
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
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import fallbackImage from 'frontend/assets/heroic_card.jpg'
import classNames from 'classnames'
import ContentPaste from '@mui/icons-material/ContentPaste'
import Clear from '@mui/icons-material/Clear'
import type { GameHandle } from 'frontend/helpers/ipc'

type Props = {
  game: GameHandle
  gameInfo: GameInfo
  backdropClick: () => void
}

type SgdbTarget = 'cover' | 'square' | null

export default function EditGameDialog({
  game,
  gameInfo,
  backdropClick
}: Props) {
  const { t } = useTranslation('gamepage')
  const navigate = useNavigate()
  const goToAdvancedSettings = () => {
    backdropClick()
    navigate('/settings/advanced')
  }
  const [title, setTitle] = useState(
    gameInfo.overrides?.title || gameInfo.title
  )
  const [artCover, setArtCover] = useState(
    gameInfo.overrides?.art_cover || gameInfo.art_cover
  )
  const [artSquare, setArtSquare] = useState(
    gameInfo.overrides?.art_square || gameInfo.art_square
  )
  const [hasSgdbKey, setHasSgdbKey] = useState(false)
  const [sgdbTarget, setSgdbTarget] = useState<SgdbTarget>(null)

  useEffect(() => {
    void window.api.steamgriddb.hasApiKey().then(setHasSgdbKey)
  }, [])

  const handleSave = () => {
    // Drop fields that match the original game info — the backend deletes
    // the override entry when all three are empty, which is what we want
    // after the user resets.
    window.api.setGameMetadataOverride(game, {
      title: title === gameInfo.title ? undefined : title,
      art_cover: artCover === gameInfo.art_cover ? undefined : artCover,
      art_square: artSquare === gameInfo.art_square ? undefined : artSquare
    })
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

  async function handlePasteFromClipboard(target: 'cover' | 'square') {
    const text = (await navigator.clipboard.readText()).trim()
    if (!text) return
    if (target === 'cover') setArtCover(text)
    else setArtSquare(text)
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
                  'edit-game.placeholder.image',
                  'Paste an image URL'
                )}
                onChange={setArtCover}
                htmlId="edit-game-cover"
                value={artCover}
                icon={artCover ? <Clear /> : <ContentPaste />}
                onIconClick={() =>
                  artCover ? setArtCover('') : handlePasteFromClipboard('cover')
                }
              />
              <TextInputWithIconField
                label={t('edit-game.info.square', 'Square Image')}
                placeholder={t(
                  'edit-game.placeholder.image',
                  'Paste an image URL'
                )}
                onChange={setArtSquare}
                htmlId="edit-game-square"
                value={artSquare}
                icon={artSquare ? <Clear /> : <ContentPaste />}
                onIconClick={() =>
                  artSquare
                    ? setArtSquare('')
                    : handlePasteFromClipboard('square')
                }
              />
            </details>
            {!hasSgdbKey && (
              <WarningMessage>
                {t(
                  'edit-game.sgdb.no-key-prefix',
                  'To search SteamGridDB for cover art, add an API key in'
                )}{' '}
                <a
                  role="button"
                  tabIndex={0}
                  onClick={goToAdvancedSettings}
                  className="sgdbWarningLink"
                >
                  {t('edit-game.sgdb.no-key-link', 'Settings → Advanced')}
                </a>
                .
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
          >
            {t('edit-game.reset', 'Reset to default')}
          </button>
        )}
        <button onClick={handleSave} className="button is-success">
          {t('button.finish', 'Finish')}
        </button>
      </DialogFooter>
    </div>
  )
}
