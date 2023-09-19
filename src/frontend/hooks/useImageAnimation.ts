import React, { useCallback } from 'react'

export const useImageAnimation = (): Partial<
  React.ImgHTMLAttributes<HTMLImageElement>
> & { imageAnimationClass: string } => {
  const handleLoad: React.ReactEventHandler<HTMLImageElement> = useCallback(
    (e) => {
      e.currentTarget.classList.add('loaded')
    },
    []
  )

  return { onLoad: handleLoad, imageAnimationClass: 'loadAnimation' }
}
