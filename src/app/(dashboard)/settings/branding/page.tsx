'use client'

import { BrandingForm } from '@/components/settings/BrandingForm'

export default function BrandingPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Branding</h1>
        <p className="text-muted-foreground">
          Customize how InsightForge looks for your team
        </p>
      </div>
      <BrandingForm />
    </div>
  )
}
