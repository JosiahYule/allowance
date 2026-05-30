import { useEffect } from 'react'

function Toast({ message, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 2000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div
      className="fixed bottom-28 left-1/2 -translate-x-1/2 bg-ink text-paper text-[13px] font-medium px-5 py-2.5 rounded-full z-[60] pointer-events-none"
      style={{ boxShadow: '0 10px 30px -8px rgba(26, 25, 23, 0.5)' }}
    >
      {message}
    </div>
  )
}

export default Toast
