import React from 'react'
import './index.css'

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
    </div>
  )
}

export default GamePicture
