import { useEffect, useState } from 'react'

export function useTheme() {
  const [theme, setThemeState] = useState(
    () => localStorage.getItem('theme') ?? 'light'
  )

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  return { theme, setTheme: setThemeState }
}
