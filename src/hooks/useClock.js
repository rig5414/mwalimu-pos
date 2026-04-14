import { useState, useEffect } from 'react'

export function useClock() {
  const [time, setTime] = useState(
    new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
  )
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }))
    }, 10000)
    return () => clearInterval(interval)
  }, [])
  return time
}
