import React from 'react'

type Props = {
  art_logo: string,
  art_square: string
}

function GamePicture({art_square, art_logo}: Props) {
  return (<div className="gamePicture">
    <img alt="cover-art" src={`${art_square}?h=400&resize=1&w=300`} className="gameImg" />
    {art_logo && <img alt="cover-art" src={`${art_logo}?h=100&resize=1&w=200`} className="gameLogo" />}
  </div>);
}

export default GamePicture
