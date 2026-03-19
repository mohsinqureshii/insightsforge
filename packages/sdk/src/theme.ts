import type { InsightForgeTheme } from './types'

/**
 * Convert an InsightForgeTheme object into a URLSearchParams-compatible
 * JSON string that the embed page will apply as CSS custom properties.
 */
export function serializeTheme(theme: InsightForgeTheme): string {
  return JSON.stringify(theme)
}

/**
 * Apply an InsightForgeTheme to a host-side container element by setting
 * CSS custom properties.  Called when the host wants to preview theme
 * changes without reloading the iframe.
 */
export function applyThemeToElement(
  element: HTMLElement,
  theme: InsightForgeTheme,
): void {
  if (theme.primaryColour) {
    element.style.setProperty('--if-primary', theme.primaryColour)
  }
  if (theme.fontFamily) {
    element.style.setProperty('--if-font-family', theme.fontFamily)
  }
  if (theme.borderRadius) {
    element.style.setProperty('--if-border-radius', theme.borderRadius)
  }
  if (theme.darkMode !== undefined) {
    element.setAttribute('data-if-theme', theme.darkMode ? 'dark' : 'light')
  }
}
