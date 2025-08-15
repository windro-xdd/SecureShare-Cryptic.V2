"use client"

import { createContext, useContext, useEffect, useState } from "react"

type Accent = "teal" | "blue" | "rose" | "amber";
type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  defaultAccent?: Accent
  storageKey?: string
  accentStorageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
  accent: Accent
  setAccent: (accent: Accent) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
  accent: "teal",
  setAccent: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  defaultAccent = "teal",
  storageKey = "vite-ui-theme",
  accentStorageKey = "vite-ui-accent",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  )
  const [accent, setAccent] = useState<Accent>(
    () => (localStorage.getItem(accentStorageKey) as Accent) || defaultAccent
  )

  useEffect(() => {
    const root = window.document.documentElement
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    
    const effectiveTheme = theme === "system" ? (mediaQuery.matches ? "dark" : "light") : theme;
    root.setAttribute('data-theme', effectiveTheme);

    const handleChange = () => {
      if (theme === "system") {
        const newTheme = mediaQuery.matches ? "dark" : "light";
        root.setAttribute('data-theme', newTheme);
      }
    }

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme])

  useEffect(() => {
    const root = window.document.documentElement
    root.setAttribute('data-accent', accent);
  }, [accent])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
    accent,
    setAccent: (accent: Accent) => {
      localStorage.setItem(accentStorageKey, accent)
      setAccent(accent)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}