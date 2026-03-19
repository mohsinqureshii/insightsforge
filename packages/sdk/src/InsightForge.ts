import type { InsightForgeConfig, SDKToken } from './types'

let _config: InsightForgeConfig | null = null
let _sdkToken: SDKToken | null = null

export const InsightForge = {
  async init(config: InsightForgeConfig): Promise<void> {
    _config = config
    // Exchange apiKey + userId + userRole for a short-lived SDK token
    const baseUrl = config.baseUrl ?? 'https://app.insightforge.io'
    const res = await fetch(`${baseUrl}/api/auth/sdk-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.apiKey,
      },
      body: JSON.stringify({
        tenantId: config.tenantId,
        userId: config.userId,
        userRole: config.userRole,
        dataFilters: config.dataFilters,
        locale: config.locale ?? 'en',
      }),
    })
    if (!res.ok) throw new Error('InsightForge SDK init failed: ' + res.statusText)
    const body = await res.json() as { success: boolean; data: SDKToken }
    _sdkToken = body.data
  },

  getConfig(): InsightForgeConfig {
    if (!_config) throw new Error('InsightForge.init() must be called before using the SDK')
    return _config
  },

  getToken(): SDKToken {
    if (!_sdkToken) throw new Error('InsightForge.init() has not completed yet')
    return _sdkToken
  },

  isReady(): boolean {
    return _config !== null && _sdkToken !== null
  },
}
