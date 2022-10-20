import React from 'react'
import { CachedImage } from 'frontend/components/UI'

import './index.css'
import fallbackImage from 'frontend/assets/fallback-image.jpg'

type Props = {
  art_square: string
  store: string
}

function GamePicture({ art_square, store }: Props) {
  function getImageFormatting() {
    if (art_square === 'fallback') return fallbackImage
    if (store === 'legendary') {
      return [
        `${art_square}?h=800&resize=1&w=600`,
        `${art_square}?h=400&resize=1&w=300`
      ]
    } else {
      return [art_square, '']
    }
  }

  const [src, fallback] = getImageFormatting()

  return (
    <div className="gamePicture">
      <CachedImage
        alt="cover-art"
        className="gameImg"
        src={src}
        fallback={fallback}
      />
    </div>
  )
}

export default GamePicture
