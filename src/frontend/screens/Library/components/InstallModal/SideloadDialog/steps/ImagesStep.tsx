import { useEffect, useState } from 'react'
import axios from 'axios'
import classNames from 'classnames'
import {
  CachedImage,
  SteamGridDBPicker,
  WarningMessage
} from 'frontend/components/UI'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch, faSpinner } from '@fortawesome/free-solid-svg-icons'
import fallbackImage from 'frontend/assets/heroic_card.jpg'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import TextInputWithIconField from 'frontend/components/UI/TextInputWithIconField'
import { Folder } from '@mui/icons-material'

type Props = {
  backdropClick: () => void
  title: string
  hasSgdbKey: boolean
  imageUrl: string
  heroUrl: string
  setImageUrl: (val: string) => void
  setHeroUrl: (val: string) => void
}

export default function ImagesStep({
  backdropClick,
  title,
  imageUrl,
  setImageUrl,
  heroUrl,
  setHeroUrl,
  hasSgdbKey
}: Props) {
  const { t } = useTranslation('gamepage')

  const [searching, setSearching] = useState(false)
  const [imageLoading, setImageLoading] = useState(false)
  const [sgdbTarget, setSgdbTarget] = useState<'cover' | 'square' | null>(null)

  const navigate = useNavigate()
  const goToAdvancedSettings = () => {
    backdropClick()
    navigate('/settings/advanced')
  }

  useEffect(() => {
    searchImage()
  }, [])

  async function searchImage() {
    if (hasSgdbKey) {
      if (!imageUrl) setSgdbTarget('square')
      return
    }
    setSearching(true)

    try {
      const response = await axios.get(
        `https://steamgrid.usebottles.com/api/search/${title}`,
        { timeout: 3500 }
      )

      if (response.status === 200) {
        const steamGridImage = response.data as string

        if (steamGridImage && steamGridImage.startsWith('http')) {
          setImageUrl(steamGridImage)
        }
      } else {
        throw new Error('Fetch failed')
      }
    } catch (error) {
      window.api.logError(`${error}`)
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
        {
          name: 'Images',
          extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif']
        },
        { name: 'All', extensions: ['*'] }
      ]
    })

    if (!path) return
    if (target === 'cover') setHeroUrl(`file://${path}`)
    else setImageUrl(`file://${path}`)
  }

  return (
    <div>
      {sgdbTarget ? (
        <SteamGridDBPicker
          initialTitle={title}
          mode={sgdbTarget === 'cover' ? 'heroes' : 'grids'}
          onClose={() => setSgdbTarget(null)}
          onSelect={(url: string) => {
            if (sgdbTarget === 'cover') {
              setHeroUrl(url)
            } else if (url !== imageUrl) {
              setImageLoading(true)
              setImageUrl(url)
            }
            setSgdbTarget(null)
          }}
        />
      ) : (
        <>
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
          <div className="sideloadImages">
            <div
              className={classNames('appImageContainer', {
                hasSgdbKey,
                searching,
                loading: imageLoading
              })}
              onClick={() => hasSgdbKey && setSgdbTarget('square')}
            >
              <CachedImage
                className={classNames('appImage', {
                  blackWhiteImage: searching
                })}
                src={imageUrl ? imageUrl : fallbackImage}
                onLoad={() => setImageLoading(false)}
                onError={() => setImageLoading(false)}
              />
              {(searching || imageLoading) && (
                <div className="imageLoadingOverlay">
                  <FontAwesomeIcon icon={faSpinner} spin size="3x" />
                </div>
              )}
              {hasSgdbKey && !searching && !imageLoading && (
                <div className="imageHoverOverlay">
                  <FontAwesomeIcon icon={faSearch} size="3x" />
                </div>
              )}
            </div>
            <div
              className={classNames('appImageContainer heroImageContainer', {
                hasSgdbKey
              })}
              onClick={() => hasSgdbKey && setSgdbTarget('cover')}
            >
              <CachedImage
                className="appImage heroImage"
                src={heroUrl || imageUrl || fallbackImage}
              />
              {hasSgdbKey && (
                <div className="imageHoverOverlay">
                  <FontAwesomeIcon icon={faSearch} size="3x" />
                </div>
              )}
            </div>
          </div>
          <div className="sideloadImagesForm">
            <TextInputWithIconField
              label={t(
                'sideload.info.image-hint',
                'Square Art (click on the image to search on SteamGridDB)'
              )}
              placeholder={t(
                'sideload.placeholder.image',
                'Paste an URL of an Image or select one from your computer'
              )}
              onChange={(newValue: string) => setImageUrl(newValue)}
              htmlId="sideload-image"
              value={imageUrl}
              icon={<Folder />}
              onIconClick={() => handleSelectLocalImage('square')}
            />
            <TextInputWithIconField
              label={t(
                'sideload.info.cover-hint',
                'Cover/Hero Art (click on the image to search on SteamGridDB)'
              )}
              placeholder={t(
                'sideload.placeholder.image',
                'Paste an URL of an Image or select one from your computer'
              )}
              onChange={(newValue: string) => setHeroUrl(newValue)}
              htmlId="sideload-cover"
              value={heroUrl}
              icon={<Folder />}
              onIconClick={() => handleSelectLocalImage('cover')}
            />
          </div>
        </>
      )}
    </div>
  )
}
