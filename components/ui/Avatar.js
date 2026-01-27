import { getInitials } from '../../lib/utils'

const colorClasses = {
  gray: 'bg-gray-200 text-gray-700',
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  red: 'bg-red-100 text-red-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  purple: 'bg-purple-100 text-purple-700',
  primary: 'bg-primary-100 text-primary-700',
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
}

export function Avatar({ firstName, lastName, src, size = 'md', color = 'primary', className = '' }) {
  const initials = getInitials(firstName, lastName)
  
  if (src) {
    return (
      <img
        src={src}
        alt={`${firstName} ${lastName}`}
        className={`rounded-full object-cover ${sizeClasses[size]} ${className}`}
      />
    )
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center font-medium ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
      aria-label={`Avatar for ${firstName} ${lastName}`}
    >
      {initials}
    </div>
  )
}

export function AvatarGroup({ items, max = 4, size = 'sm' }) {
  const visible = items.slice(0, max)
  const remaining = items.length - max

  return (
    <div className="flex -space-x-2">
      {visible.map((item, index) => (
        <Avatar
          key={item.id || index}
          firstName={item.firstName}
          lastName={item.lastName}
          src={item.avatar}
          size={size}
          className="ring-2 ring-white"
        />
      ))}
      {remaining > 0 && (
        <div
          className={`rounded-full flex items-center justify-center bg-gray-200 text-gray-600 font-medium ring-2 ring-white ${sizeClasses[size]}`}
        >
          +{remaining}
        </div>
      )}
    </div>
  )
}
