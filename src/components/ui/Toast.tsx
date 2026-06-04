import { useEffect, useState } from 'react'
import { CheckCircle, AlertCircle, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface ToastProps {
  message: string
  type?: ToastType
  onClose: () => void
}

export function Toast({ message, type = 'success', onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])

  const colors = {
    success: 'bg-emerald-900 border-emerald-700 text-emerald-100',
    error: 'bg-red-900 border-red-700 text-red-100',
    info: 'bg-teal-900 border-teal-700 text-teal-50',
  }

  const Icon = type === 'success' ? CheckCircle : AlertCircle

  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl animate-slide-up ${colors[type]}`}>
      <Icon size={18} />
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  )
}

// Global toast state (simple)
type ToastState = { message: string; type: ToastType; id: number } | null
let toastSetter: ((t: ToastState) => void) | null = null

export function showToast(message: string, type: ToastType = 'success') {
  toastSetter?.({ message, type, id: Date.now() })
}

export function ToastContainer() {
  const [toast, setToast] = useState<ToastState>(null)
  toastSetter = setToast

  if (!toast) return null
  return <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => setToast(null)} />
}
