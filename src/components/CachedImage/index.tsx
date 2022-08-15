import React, { useState } from 'react'

interface CachedImageProps {
  src: string
}

type Props = React.ImgHTMLAttributes<HTMLImageElement> & CachedImageProps

const CachedImage = (props: Props) => {
  const [useCache, setUseCache] = useState(true)

  const src = props.src && useCache ? `imagecache://${props.src}` : props.src

  return <img {...props} src={src} onError={() => setUseCache(false)} />
}

export default CachedImage
