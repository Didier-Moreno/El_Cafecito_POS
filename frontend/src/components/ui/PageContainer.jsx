export default function PageContainer({ children, className = '' }) {
  return (
    <div className={`p-4 lg:p-6 space-y-6 ${className}`}>
      {children}
    </div>
  )
}
