import type { TenantSettings } from '@/types/insightsforge'

type ExtendedTenantSettings = TenantSettings & {
  primaryColour?: string
  fontFamily?: string
}

export function getBrandingCSSVars(settings: ExtendedTenantSettings): Record<string, string> {
  return {
    '--if-primary': settings.primaryColour ?? settings.primaryColor ?? '#6366F1',
    '--if-font': settings.fontFamily ?? 'Inter, sans-serif',
  }
}
