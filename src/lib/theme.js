// Light/dark theme: 'system' follows the OS, 'light'/'dark' force it. The choice
// is saved locally and applied by toggling `html.dark`, which flips the palette
// variables in index.css. An inline script in index.html applies it before
// first paint to avoid a flash.

const KEY = 'allowance-theme'
export const THEMES = ['system', 'light', 'dark']

export function getTheme() {
  return localStorage.getItem(KEY) || 'system'
}

function prefersDark() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

export function isDark(theme = getTheme()) {
  return theme === 'dark' || (theme === 'system' && prefersDark())
}

export function applyTheme(theme = getTheme()) {
  const dark = isDark(theme)
  document.documentElement.classList.toggle('dark', dark)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#1A1814' : '#FBFAF7')
}

export function setTheme(theme) {
  localStorage.setItem(KEY, theme)
  applyTheme(theme)
}

// Re-apply when the OS theme changes, but only while in "system" mode.
export function watchSystemTheme() {
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
    if (getTheme() === 'system') applyTheme('system')
  })
}
