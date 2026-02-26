import React from 'react'

type Loader<T extends React.ComponentType<any>> = () => Promise<{ default: T }>

export default function dynamic<T extends React.ComponentType<any>>(
  loader: Loader<T>,
  _options?: { ssr?: boolean; loading?: React.ComponentType }
): React.ComponentType<React.ComponentProps<T>> {
  const LazyComponent = React.lazy(loader)
  return function DynamicComponent(props: React.ComponentProps<T>) {
    return (
      <React.Suspense fallback={null}>
        <LazyComponent {...props} />
      </React.Suspense>
    )
  }
}
