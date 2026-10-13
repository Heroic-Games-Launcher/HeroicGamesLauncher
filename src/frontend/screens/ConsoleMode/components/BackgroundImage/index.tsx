import { CachedImage } from 'frontend/components/UI'
import { useEffect, useState } from 'react'

interface Props {
  url: string
}

export default function BackgroundImage({ url }: Props) {
  const [firstImage, setFirstImage] = useState(url)
  const [secondImage, setSecondImage] = useState(url)
  const [firstShown, setFirstShown] = useState(true)

  useEffect(() => {
    const image = firstShown ? firstImage : secondImage
    const otherImage = firstShown ? secondImage : firstImage
    const setOther = firstShown ? setSecondImage : setFirstImage
    if (url === image) return
    if (url === otherImage) {
      setFirstShown(!firstShown)
      return
    }
    setOther(url)
  }, [url])

  function handleIncomingLoaded() {
    setFirstShown(!firstShown)
  }

  return (
    <div className="consoleCardBackgroundContainer">
      <CachedImage
        className="consoleCardBackgroundImageLayer"
        src={firstImage}
        style={{ opacity: firstShown ? 1 : 0 }}
        aria-hidden
        onLoad={handleIncomingLoaded}
        alt=""
      />
      <CachedImage
        className="consoleCardBackgroundImageLayer"
        src={secondImage}
        style={{ opacity: firstShown ? 0 : 1 }}
        onLoad={handleIncomingLoaded}
        aria-hidden
        alt=""
      />
    </div>
  )
}
