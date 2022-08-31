import React from 'react'
import { CachedImage } from 'frontend/components/UI'

import './index.css'
import fallbackImage from 'frontend/assets/fallback-image.jpg'

type Props = {
  art_square: string
  store: string
}

function GamePicture({ art_square, store }: Props) {
  function getImageFormatting(): { src: string; fallback?: string } {
    if (art_square === 'fallback') return { src: fallbackImage }
    if (store === 'legendary') {
      return {
        src: `${art_square}?h=800&resize=1&w=600`,
        fallback: `${art_square}?h=400&resize=1&w=300`
      }
    } else {
      return { src: art_square }
    }
  }

  const { src, fallback } = getImageFormatting()

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
