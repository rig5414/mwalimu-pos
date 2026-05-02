import { useToastStore } from '../hooks/useToast'

const variantStyles = {
  success: 'bg-green-500 text-white',
  error: 'bg-red-500 text-white',
  warning: 'bg-amber-500 text-white',
  info: 'bg-blue-500 text-white',
}

const variantIcons = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
}

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const removeToast = useToastStore((s) => s.remove)

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 space-y-2 max-w-md w-full px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${variantStyles[toast.variant]} px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in-up`}
        >
          <span className="text-lg font-bold">{variantIcons[toast.variant]}</span>
          <p className="flex-1 text-sm">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-white hover:opacity-75 transition-opacity"
            aria-label="Close notification"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
