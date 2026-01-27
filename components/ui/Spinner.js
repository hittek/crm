export function Spinner({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-6 w-6 border-2',
    lg: 'h-8 w-8 border-3',
  }

  return (
    <div
      className={`animate-spin rounded-full border-gray-300 border-t-primary-600 ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="Loading"
    />
  )
}

export function LoadingOverlay({ message = 'Cargando...' }) {
  return (
    <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <span className="text-sm text-gray-600">{message}</span>
      </div>
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  )
}
