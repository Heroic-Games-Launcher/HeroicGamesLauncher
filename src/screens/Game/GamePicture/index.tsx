import React from 'react'
import './index.css'
import EpicLogo from '../../../assets/epic-logo.svg'
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
        {store == 'legendary' ? <img src={EpicLogo} alt="" /> : GOGLogo()}
      </div>
    </div>
  )
}

export default GamePicture

function GOGLogo() {
  return (
    <svg
      className="gogIcon"
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      style={{ fill: 'white' }}
    >
      <use xlinkHref="#icon-logo-gog">
        <symbol
          preserveAspectRatio="xMidYMax meet"
          viewBox="0 0 34 31"
          id="icon-logo-gog"
        >
          <path
            className="cls-1"
            d="M31,31H3a3,3,0,0,1-3-3V3A3,3,0,0,1,3,0H31a3,3,0,0,1,3,3V28A3,3,0,0,1,31,31ZM4,24.5A1.5,1.5,0,0,0,5.5,26H11V24H6.5a.5.5,0,0,1-.5-.5v-3a.5.5,0,0,1,.5-.5H11V18H5.5A1.5,1.5,0,0,0,4,19.5Zm8-18A1.5,1.5,0,0,0,10.5,5h-5A1.5,1.5,0,0,0,4,6.5v5A1.5,1.5,0,0,0,5.5,13H9V11H6.5a.5.5,0,0,1-.5-.5v-3A.5.5,0,0,1,6.5,7h3a.5.5,0,0,1,.5.5v6a.5.5,0,0,1-.5.5H4v2h6.5A1.5,1.5,0,0,0,12,14.5Zm0,13v5A1.5,1.5,0,0,0,13.5,26h5A1.5,1.5,0,0,0,20,24.5v-5A1.5,1.5,0,0,0,18.5,18h-5A1.5,1.5,0,0,0,12,19.5Zm9-13A1.5,1.5,0,0,0,19.5,5h-5A1.5,1.5,0,0,0,13,6.5v5A1.5,1.5,0,0,0,14.5,13h5A1.5,1.5,0,0,0,21,11.5Zm9,0A1.5,1.5,0,0,0,28.5,5h-5A1.5,1.5,0,0,0,22,6.5v5A1.5,1.5,0,0,0,23.5,13H27V11H24.5a.5.5,0,0,1-.5-.5v-3a.5.5,0,0,1,.5-.5h3a.5.5,0,0,1,.5.5v6a.5.5,0,0,1-.5.5H22v2h6.5A1.5,1.5,0,0,0,30,14.5ZM30,18H22.5A1.5,1.5,0,0,0,21,19.5V26h2V20.5a.5.5,0,0,1,.5-.5h1v6h2V20H28v6h2ZM18.5,11h-3a.5.5,0,0,1-.5-.5v-3a.5.5,0,0,1,.5-.5h3a.5.5,0,0,1,.5.5v3A.5.5,0,0,1,18.5,11Zm-4,9h3a.5.5,0,0,1,.5.5v3a.5.5,0,0,1-.5.5h-3a.5.5,0,0,1-.5-.5v-3A.5.5,0,0,1,14.5,20Z"
          ></path>
        </symbol>
      </use>
    </svg>
  )
}
