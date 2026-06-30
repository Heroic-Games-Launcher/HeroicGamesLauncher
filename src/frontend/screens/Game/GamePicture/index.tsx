import React from 'react'
import { CachedImage } from 'frontend/components/UI'
import { getImageFormatting } from 'frontend/screens/Library/components/GameCard/constants'
import { Runner } from 'common/types'

import './index.css'

interface Props extends React.ImgHTMLAttributes<HTMLImageElement> {
  art_square: string
  art_logo?: string | undefined
  store: string
}

function GamePicture({
  art_square,
  art_logo,
  store,
  className,
  ...props
}: Props) {
  const runner = store as Runner
  const src = getImageFormatting(art_square, runner, 'high')
  const fallback = getImageFormatting(art_square, runner, 'medium')

  return (
    <div className="gamePicture">
      <CachedImage
        alt="cover-art"
        className={`gameImg ${className}`}
        src={src}
        fallback={fallback}
        {...props}
      />
      {art_logo && (
        <CachedImage
          alt="logo"
          src={`${art_logo}?h=400&resize=1&w=300`}
          className={`gameLogo`}
        />
      )}
    </div>
  )
}

export default GamePicture
