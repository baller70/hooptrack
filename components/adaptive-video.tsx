'use client'

import { useState, forwardRef, type VideoHTMLAttributes } from 'react'

interface Props extends VideoHTMLAttributes<HTMLVideoElement> {
  // Fallback aspect ratio while metadata is loading. Defaults to 16:9.
  fallbackAspect?: number
  // Cap on the video's height. Useful inside scrollable feeds.
  maxHeightClass?: string
  containerClassName?: string
}

// Wraps a <video> with a container that adapts to the video's actual
// aspect ratio. Portrait clips render tall; landscape clips render wide.
// No cropping (object-contain), no fixed 16:9 letterbox.
const AdaptiveVideo = forwardRef<HTMLVideoElement, Props>(function AdaptiveVideo(
  { fallbackAspect = 16 / 9, maxHeightClass = 'max-h-[70vh]', containerClassName = '', className = '', onLoadedMetadata, ...rest },
  ref,
) {
  const [aspect, setAspect] = useState<number | null>(null)

  return (
    <div
      className={`bg-black rounded overflow-hidden mx-auto w-full ${maxHeightClass} ${containerClassName}`}
      style={{ aspectRatio: aspect ?? fallbackAspect }}
    >
      <video
        ref={ref}
        {...rest}
        onLoadedMetadata={(e) => {
          const v = e.currentTarget
          if (v.videoWidth > 0 && v.videoHeight > 0) {
            setAspect(v.videoWidth / v.videoHeight)
          }
          onLoadedMetadata?.(e)
        }}
        className={`w-full h-full object-contain ${className}`}
      />
    </div>
  )
})

export default AdaptiveVideo
