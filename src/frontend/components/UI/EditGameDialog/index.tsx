import './index.scss'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { GameInfo } from 'common/types'
import { CachedImage, TextInputField } from 'frontend/components/UI'
import TextInputWithIconField from 'frontend/components/UI/TextInputWithIconField'
import { DialogContent, DialogFooter } from 'frontend/components/UI/Dialog'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import fallbackImage from 'frontend/assets/heroic_card.jpg'
import classNames from 'classnames'
import axios from 'axios'
import Folder from '@mui/icons-material/Folder'

type Props = {
  gameInfo: GameInfo
  backdropClick: () => void
}

export default function EditGameDialog({ gameInfo, backdropClick }: Props) {
  const { t } = useTranslation('gamepage')
  const [title, setTitle] = useState(gameInfo.title)
  const [artCover, setArtCover] = useState(gameInfo.art_cover)
  const [artSquare, setArtSquare] = useState(gameInfo.art_square)
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSave = () => {
    setSaving(true)
    // For non-sideloaded games, we use the overrides API
    window.api.setGameMetadataOverride({
      appName: gameInfo.app_name,
      title,
      art_cover: artCover,
      art_square: artSquare
    })
    setSaving(false)
    backdropClick()
  }

  async function searchImage() {
    if (!title) return
    setSearching(true)
    try {
      const response = await axios.get(
        `https://steamgrid.usebottles.com/api/search/${title}`,
        { timeout: 3500 }
      )
      if (response.status === 200) {
        const steamGridImage = response.data as string
        if (steamGridImage && steamGridImage.startsWith('http')) {
          setArtCover(steamGridImage)
          setArtSquare(steamGridImage)
        }
      }
    } catch (error) {
      window.api.logError(`SteamGrid search failed: ${String(error)}`)
    } finally {
      setSearching(false)
    }
  }

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

    if (path) {
      if (target === 'cover') setArtCover(`file://${path}`)
      else setArtSquare(`file://${path}`)
    }
  }

  return (
    <div className="EditGameDialog">
      <DialogContent>
        <div className="editGameGrid">
          <div className="imageIcons">
            <div className="previewItem">
              <span className="previewLabel">
                {t('edit-game.cover', 'Cover Art')}
              </span>
              <CachedImage
                className={classNames('appImage', {
                  blackWhiteImage: searching
                })}
                src={artCover || fallbackImage}
              />
            </div>
            <div className="previewItem">
              <span className="previewLabel">
                {t('edit-game.square', 'Square Art')}
              </span>
              <CachedImage
                className={classNames('appImage square', {
                  blackWhiteImage: searching
                })}
                src={artSquare || artCover || fallbackImage}
              />
            </div>
          </div>
          <div className="editGameForm">
            <TextInputField
              label={t('sideload.info.title', 'Game/App Title')}
              placeholder={t(
                'sideload.placeholder.title',
                'Add a title to your Game/App'
              )}
              onChange={setTitle}
              onBlur={async () => searchImage()}
              htmlId="edit-game-title"
              value={title}
              maxLength={40}
            />
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
          </div>
        </div>
      </DialogContent>
      <DialogFooter>
        <button
          onClick={handleSave}
          className="button is-success"
          disabled={saving || searching}
        >
          {saving && <FontAwesomeIcon icon={faSpinner} spin />}
          {!saving && t('button.finish', 'Finish')}
        </button>
      </DialogFooter>
    </div>
  )
}
