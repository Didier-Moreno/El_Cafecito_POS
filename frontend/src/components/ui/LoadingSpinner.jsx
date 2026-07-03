export default function LoadingSpinner({ size = 'md', className = '' }) {
  const sizeMap = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' }
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`${sizeMap[size]} rounded-full border-2 border-cafe-beige border-t-cafe-medio animate-spin`}
      />
    </div>
  )
}
