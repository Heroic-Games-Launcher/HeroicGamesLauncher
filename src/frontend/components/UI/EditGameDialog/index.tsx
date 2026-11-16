import './index.css'
import { ClipboardPaste, Search, X } from 'lucide-react'
import { GameInfo } from 'common/types'
import {
  CachedImage,
  TextInputField,
  SteamGridDBPicker,
  Alert
} from 'frontend/components/UI'
import Icon from 'frontend/components/UI/Icon'
import TextInputWithIconField from 'frontend/components/UI/TextInputWithIconField'
import { ModalFooter } from 'frontend/components/UI/Modal'
import Button from 'frontend/components/UI/Button'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import fallbackImage from 'frontend/assets/heroic_card.jpg'
import classNames from 'classnames'

type Props = {
  gameInfo: GameInfo
  backdropClick: () => void
}

type SgdbTarget = 'cover' | 'square' | null

export default function EditGameDialog({ gameInfo, backdropClick }: Props) {
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
    window.api.setGameMetadataOverride({
      appName: gameInfo.app_name,
      title: title === gameInfo.title ? '' : title,
      art_cover: artCover === gameInfo.art_cover ? '' : artCover,
      art_square: artSquare === gameInfo.art_square ? '' : artSquare
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
              icon={
                artCover ? (
                  <Icon glyph={X} size="sm" />
                ) : (
                  <Icon glyph={ClipboardPaste} size="sm" />
                )
              }
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
              icon={
                artSquare ? (
                  <Icon glyph={X} size="sm" />
                ) : (
                  <Icon glyph={ClipboardPaste} size="sm" />
                )
              }
              onIconClick={() =>
                artSquare
                  ? setArtSquare('')
                  : handlePasteFromClipboard('square')
              }
            />
          </details>
          {!hasSgdbKey && (
            <Alert variant="warning">
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
            </Alert>
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
                  <Icon glyph={Search} size="xl" />
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
                  <Icon glyph={Search} size="xl" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <ModalFooter>
        <Button onClick={handleSave}>{t('button.finish', 'Finish')}</Button>
        {hasOverride && (
          <Button variant="secondary" onClick={handleReset}>
            {t('edit-game.reset', 'Reset to default')}
          </Button>
        )}
      </ModalFooter>
    </div>
  )
}
