import React from 'react'
import './index.css'
import fallbackImage from 'src/assets/fallback-image.jpg'
type Props = {
  art_square: string
  store: string
}

function GamePicture({ art_square, store }: Props) {
  function getImageFormatting() {
    if (art_square === 'fallback') return fallbackImage
    if (store === 'legendary') {
      return `${art_square}?h=800&resize=1&w=600`
    } else {
      return art_square
    }
  }

  return (
    <div className="gamePicture">
      <img alt="cover-art" src={getImageFormatting()} className="gameImg" />
    </div>
  )
}

export default GamePicture
