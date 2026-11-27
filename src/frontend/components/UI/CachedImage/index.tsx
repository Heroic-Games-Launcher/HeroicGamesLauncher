import React, { useEffect, useState } from 'react'
import classNames from 'classnames'

interface CachedImageProps {
  src: string
  fallback?: string
  className?: string
  onLoad?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void
  /** Called once src and fallback both failed */
  onFinalError?: () => void
}

type Props = React.ImgHTMLAttributes<HTMLImageElement> & CachedImageProps

const isCacheableSource = (src?: string) =>
  Boolean(src?.startsWith('http') || src?.startsWith('file://'))

const CachedImage = (props: Props) => {
  const [useCache, setUseCache] = useState(isCacheableSource(props.src))
  const [loaded, setLoaded] = useState(false)
  const [useFallback, setUseFallback] = useState(false)

  useEffect(() => {
    setLoaded(false)
    setUseFallback(false)
    setUseCache(isCacheableSource(props.src))
  }, [props.src])

  const onError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // if not cached, tried with the real
    if (useCache) {
      setUseCache(false)
    } else {
      // if not cached and can't access real, try with the fallback
      if (props.fallback && !useFallback) {
        setUseFallback(true)
        setUseCache(props.fallback.startsWith('http'))
      } else {
        props.onFinalError?.()
      }
    }
    props.onError?.(e)
  }

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setLoaded(true)
    props.onLoad?.(e)
  }

  let src = useFallback ? props.fallback : props.src
  src = useCache && src ? `imagecache://${encodeURIComponent(src)}` : src

  // Not DOM attributes
  const { onFinalError, fallback, ...imgProps } = props

  return (
    <img
      loading="lazy"
      {...imgProps}
      src={src}
      onLoad={handleLoad}
      onError={onError}
      className={classNames(props.className, {
        loaded,
        loading: !loaded
      })}
    />
  )
}

export default CachedImage
