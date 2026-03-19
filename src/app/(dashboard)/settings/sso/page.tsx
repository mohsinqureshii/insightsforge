'use client'

import { SSOConfig } from '@/components/settings/SSOConfig'

export default function SSOPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Single Sign-On (SSO)</h1>
        <p className="text-muted-foreground">
          Configure SAML 2.0 or OIDC to enable SSO for your organization
        </p>
      </div>
      <SSOConfig />
    </div>
  )
}
