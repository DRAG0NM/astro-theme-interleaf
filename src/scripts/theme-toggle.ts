// Theme toggle: ink-drop view transition and system theme sync.
// Paired styles live in src/styles/transition.css.

type StoredTheme = 'dark' | 'light'

function getStoredTheme(): StoredTheme | null {
  const storedTheme = localStorage.getItem('theme')
  return storedTheme === 'dark' || storedTheme === 'light' ? storedTheme : null
}

// Apply theme changes
function applyTheme(isDark: boolean, options: { persist?: boolean } = {}) {
  document.documentElement.classList.toggle('dark', isDark)

  // Update meta theme-color tag
  const metaThemeColor = document.head.querySelector('meta[name="theme-color"]')
  const themeButton = document.getElementById('theme-toggle-button')
  const lightMode = themeButton?.dataset.lightMode
  const darkMode = themeButton?.dataset.darkMode

  if (metaThemeColor && lightMode && darkMode) {
    metaThemeColor.setAttribute('content', isDark ? darkMode : lightMode)
    document.documentElement.style.backgroundColor = isDark ? darkMode : lightMode
  }

  if (options.persist === true) {
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }
  document.dispatchEvent(new Event('theme-changed'))
}

// Toggle theme mode
function toggleThemeFromUser() {
  const isDark = !document.documentElement.classList.contains('dark')
  applyTheme(isDark, { persist: true })
}

let activeThemeTransition: { finished: Promise<unknown> } | null = null

function clearThemeTransition(root: HTMLElement) {
  root.style.removeProperty('view-transition-name')
  root.style.removeProperty('--ink-x')
  root.style.removeProperty('--ink-y')
  root.style.removeProperty('--ink-size')
  root.removeAttribute('data-theme-changing')
  activeThemeTransition = null
}

// Handle theme toggle click events
function handleThemeToggle(e: MouseEvent) {
  if (!(e.target instanceof Element)) {
    return
  }

  const themeButton = e.target.closest('#theme-toggle-button')
  if (!(themeButton instanceof HTMLElement)) {
    return
  }

  const root = document.documentElement
  const supportsTransition = typeof document.startViewTransition === 'function'

  // If motion is reduced, the API is unavailable, or a transition is running,
  // keep the theme change immediate and deterministic.
  if (root.classList.contains('reduce-motion') || !supportsTransition) {
    toggleThemeFromUser()
    return
  }
  if (activeThemeTransition) {
    return
  }

  // The ink drop lands on the toggle itself (also when triggered by keyboard).
  const rect = themeButton.getBoundingClientRect()
  const x = rect.left + rect.width / 2
  const y = rect.top + rect.height / 2
  const farthest = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  )
  // The blob's solid core is ~30% of its image, see transition.css.
  const inkSize = Math.ceil(farthest * 3.4)
  const goingDark = !root.classList.contains('dark')

  // Add temporary markers before view transition
  root.style.setProperty('view-transition-name', 'theme-toggle-transition')
  root.style.setProperty('--ink-x', `${x}px`)
  root.style.setProperty('--ink-y', `${y}px`)
  root.style.setProperty('--ink-size', `${inkSize}px`)
  root.setAttribute('data-theme-changing', goingDark ? 'to-dark' : 'to-light')

  // Use View Transitions API for theme toggle
  try {
    const transition = document.startViewTransition(toggleThemeFromUser)
    activeThemeTransition = transition

    // Remove temporary markers after view transition
    transition.finished.then(
      () => clearThemeTransition(root),
      () => clearThemeTransition(root),
    )
  }
  catch {
    clearThemeTransition(root)
    toggleThemeFromUser()
  }
}

// Listen to system theme changes in real time
function handleSystemChange(event: MediaQueryListEvent) {
  if (getStoredTheme() === null) {
    applyTheme(event.matches, { persist: false })
  }
}

document.addEventListener('click', handleThemeToggle)
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', handleSystemChange)

export {}
