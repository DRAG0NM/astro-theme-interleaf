// Language Switch >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// The page is rewritten block by block, top to bottom: each visible block
// (a heading, a paragraph, a list entry...) of the old page lifts off in
// turn, then the new page's blocks are written in one after another.
// Every block gets its own view-transition-name so the browser can animate
// it separately; the count is capped so phones stay smooth.
const LANG_BLOCKS = [
  'header',
  'nav',
  '#post-date',
  '#post-content > *',
  '.post-list > li',
  'main :is(h1, h2, h3, h4, p, li, blockquote, pre, table, figure)',
  'footer',
].join(', ')
const LANG_MAX_BLOCKS = 14
const OLD_STAGGER = 0.015 // s between old blocks lifting off
const NEW_START = 0.3 // s, when the first new block starts writing
const NEW_STAGGER = 0.05 // s between new blocks

function pickBlocks(doc: Document, visibleOnly: boolean) {
  const picked: HTMLElement[] = []
  const chosen = new Set<Element>()

  for (const el of doc.querySelectorAll<HTMLElement>(LANG_BLOCKS)) {
    if (picked.length >= LANG_MAX_BLOCKS) {
      break
    }
    // Skip blocks nested in an already chosen block, and anything that
    // already carries its own transition name.
    let parent = el.parentElement
    let nested = false
    while (parent) {
      if (chosen.has(parent)) {
        nested = true
        break
      }
      parent = parent.parentElement
    }
    if (nested) {
      continue
    }
    if (visibleOnly) {
      const r = el.getBoundingClientRect()
      if (r.height === 0 || r.bottom < 0 || r.top > window.innerHeight) {
        continue
      }
    }
    chosen.add(el)
    picked.push(el)
    // Shared-element names inside a block would pull that piece out of its
    // block; across languages they never match anyway, so mute them.
    for (const inner of el.querySelectorAll<HTMLElement>('[data-astro-transition-scope]')) {
      inner.style.setProperty('view-transition-name', 'none')
    }
  }

  if (visibleOnly) {
    picked.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)
  }
  return picked
}

let languageSwitchPending = false
let oldBlockCount = 0

// Before the browser captures the old page: name its visible blocks.
document.addEventListener('astro:before-preparation', (e) => {
  oldBlockCount = 0
  languageSwitchPending = e.sourceElement instanceof Element
    && e.sourceElement.closest('#language-switcher') !== null
    && !document.documentElement.classList.contains('reduce-motion')
  if (!languageSwitchPending) {
    return
  }
  const blocks = pickBlocks(document, true)
  blocks.forEach((el, i) => {
    el.style.setProperty('view-transition-name', `lang-o-${i}`)
  })
  oldBlockCount = blocks.length
})

// Before the new page replaces the old one: name its first blocks, stamp it,
// and give every block its own delay.
document.addEventListener('astro:before-swap', (e) => {
  if (!languageSwitchPending) {
    return
  }
  languageSwitchPending = false

  const doc = e.newDocument
  doc.documentElement.setAttribute('data-lang-arrived', '')

  const blocks = pickBlocks(doc, false)
  blocks.forEach((el, i) => {
    el.style.setProperty('view-transition-name', `lang-n-${i}`)
  })

  const rules: string[] = []
  for (let i = 0; i < oldBlockCount; i++) {
    rules.push(`html[data-lang-arrived]:not([data-theme-changing])::view-transition-old(lang-o-${i}){animation-delay:${(i * OLD_STAGGER).toFixed(3)}s!important}`)
  }
  blocks.forEach((_, i) => {
    rules.push(`html[data-lang-arrived]:not([data-theme-changing])::view-transition-new(lang-n-${i}){animation-delay:${(NEW_START + i * NEW_STAGGER).toFixed(3)}s!important}`)
  })
  const style = doc.createElement('style')
  style.id = 'lang-switch-timing'
  style.textContent = rules.join('\n')
  doc.head.append(style)

  // Once the rewrite has played, drop the temporary names so they never
  // affect later transitions (theme toggle, next navigation).
  const release = () => {
    for (const el of document.querySelectorAll<HTMLElement>('[style*="view-transition-name"]')) {
      el.style.removeProperty('view-transition-name')
    }
    document.getElementById('lang-switch-timing')?.remove()
  }
  e.viewTransition.finished.then(release, release)
})

export {}
