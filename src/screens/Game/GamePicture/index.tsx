import React from 'react'

import './index.css'

type Props = {
  art_square: string
}

function GamePicture({art_square}: Props) {
  return (<div className="gamePicture">
    <img alt="cover-art" src={`${art_square}?h=800&resize=1&w=600`} className="gameImg" />
  </div>);
}

export default GamePicture
