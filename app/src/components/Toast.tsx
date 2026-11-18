import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { Mascot, type MascotAction } from './Mascot'

type Toast = { text: string; action: MascotAction }
const ToastContext = createContext<(text: string, action?: MascotAction) => void>(() => {})

/** A short note at the bottom with the mascot reacting: "Saved", "Paid", "Goal reached!" */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)
  const timer = useRef<number>(0)
  const show = useCallback((text: string, action: MascotAction = 'happy') => {
    window.clearTimeout(timer.current)
    setToast({ text, action })
    timer.current = window.setTimeout(() => setToast(null), 2600)
  }, [])
  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div className="toast" role="status">
          <Mascot action={toast.action} size={44} label="" />
          <span>{toast.text}</span>
        </div>
      )}
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
