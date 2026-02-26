import React from 'react'

type NextImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  src: string
  alt: string
  fill?: boolean
  priority?: boolean
  unoptimized?: boolean
}

export default function Image({ fill, style, ...props }: NextImageProps) {
  const mergedStyle = fill
    ? ({ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', ...style } as React.CSSProperties)
    : style

  const { unoptimized: _unoptimized, priority, ...imgProps } = props
  return <img {...imgProps} style={mergedStyle} loading={imgProps.loading || (priority ? 'eager' : 'lazy')} />
}
