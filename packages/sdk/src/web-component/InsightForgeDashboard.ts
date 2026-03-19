/**
 * InsightForgeDashboard — Custom Element (Web Component)
 *
 * Usage in plain HTML / non-React host apps:
 *
 *   <script type="module" src="@insightforge/sdk/dist/web-component.js"></script>
 *   <insightforge-dashboard
 *     dashboard-id="dash_operations_overview"
 *     token="eyJ..."
 *     base-url="https://app.insightforge.io"
 *     height="600px"
 *     locale="en"
 *   ></insightforge-dashboard>
 */

export class InsightForgeDashboard extends HTMLElement {
  private iframe: HTMLIFrameElement | null = null
  private messageHandler: ((event: MessageEvent) => void) | null = null

  static get observedAttributes(): string[] {
    return ['dashboard-id', 'token', 'base-url', 'height', 'locale', 'filters', 'theme']
  }

  connectedCallback(): void {
    this.render()
  }

  disconnectedCallback(): void {
    this.cleanup()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) {
      this.cleanup()
      this.render()
    }
  }

  private render(): void {
    const dashboardId = this.getAttribute('dashboard-id')
    const token = this.getAttribute('token')
    const baseUrl = this.getAttribute('base-url') ?? 'https://app.insightforge.io'
    const height = this.getAttribute('height') ?? '600px'
    const locale = this.getAttribute('locale') ?? 'en'
    const filters = this.getAttribute('filters')
    const theme = this.getAttribute('theme')

    if (!dashboardId || !token) {
      console.warn('[InsightForgeDashboard] dashboard-id and token attributes are required')
      return
    }

    const params = new URLSearchParams({ sdk: '1', token, locale })
    if (filters) params.set('filters', filters)
    if (theme) params.set('theme', theme)

    this.iframe = document.createElement('iframe')
    this.iframe.src = `${baseUrl}/embed/dashboard/${dashboardId}?${params.toString()}`
    this.iframe.style.width = '100%'
    this.iframe.style.height = height
    this.iframe.style.border = 'none'
    this.iframe.allow = 'fullscreen'
    this.iframe.title = `InsightForge Dashboard ${dashboardId}`

    this.messageHandler = (event: MessageEvent) => {
      if (event.source !== this.iframe?.contentWindow) return
      const msg = event.data as Record<string, unknown>
      if (msg?.type === 'IF_HEIGHT_CHANGE' && typeof msg.height === 'number') {
        if (this.iframe) this.iframe.style.height = `${msg.height}px`
      }
      // Dispatch a custom DOM event so host apps can listen
      this.dispatchEvent(new CustomEvent('if-message', { detail: msg, bubbles: true }))
    }

    window.addEventListener('message', this.messageHandler)
    this.appendChild(this.iframe)
  }

  private cleanup(): void {
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler)
      this.messageHandler = null
    }
    if (this.iframe) {
      this.iframe.remove()
      this.iframe = null
    }
  }
}

// Register the custom element if running in a browser context
if (typeof customElements !== 'undefined') {
  customElements.define('insightforge-dashboard', InsightForgeDashboard)
}
