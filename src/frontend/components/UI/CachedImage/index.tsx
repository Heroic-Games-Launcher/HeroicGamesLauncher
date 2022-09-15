import React, { useState } from 'react'

interface CachedImageProps {
  src: string
  fallback?: string
}

type Props = React.ImgHTMLAttributes<HTMLImageElement> & CachedImageProps

const CachedImage = (props: Props) => {
  const [useCache, setUseCache] = useState(props.src.startsWith('http'))
  const [useFallback, setUseFallback] = useState(false)

  const onError = () => {
    // if not cached, tried with the real
    if (useCache) {
      setUseCache(false)
    } else {
      // if not cached and can't access real, try with the fallback
      if (props.fallback) {
        setUseFallback(true)
        setUseCache(props.fallback.startsWith('http'))
      }
    }
  }

  let src = useFallback ? props.fallback : props.src
  src = useCache ? `imagecache://${src}` : src

  return <img {...props} src={src} onError={onError} />
}

export default CachedImage
