import React from 'react'
import './index.css'
import EpicLogo from 'src/assets/epic-logo.svg'
import GOGLogo from 'src/assets/gog-logo.svg'
type Props = {
  art_square: string
  store: string
}

function GamePicture({ art_square, store }: Props) {
  return (
    <div className="gamePicture">
      <img
        alt="cover-art"
        src={
          store == 'legendary'
            ? `${art_square}?h=800&resize=1&w=600`
            : art_square
        }
        className="gameImg"
      />
      <div className="store-icon">
        <img
          src={store == 'legendary' ? EpicLogo : GOGLogo}
          className={store == 'legendary' ? '' : 'gogIcon'}
          alt=""
        />
      </div>
    </div>
  )
}

export default GamePicture
