import { useEffect } from 'react'

function Toast({ message, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 2000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-black text-white text-sm px-5 py-2.5 rounded-full z-[60] shadow-lg pointer-events-none">
      {message}
    </div>
  )
}

export default Toast
