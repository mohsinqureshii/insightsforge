'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { Plus, LayoutDashboard, ArrowLeft, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { TemplateGallery } from '@/components/dashboard/TemplateGallery'
import Link from 'next/link'
import { toast } from 'sonner'

type CreationMode = 'blank' | 'template' | 'ai'

async function createDashboard(data: {
  name: string
  description?: string
  templateId?: string
}): Promise<{ id: string }> {
  const res = await fetch('/api/v1/dashboards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create dashboard')
  const json = await res.json()
  return json.data
}

async function generateWithAI(prompt: string): Promise<{ id: string }> {
  const res = await fetch('/api/v1/dashboards/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })
  if (!res.ok) throw new Error('AI generation failed')
  const json = await res.json()
  return json.data
}

export default function NewDashboardPage() {
  const router = useRouter()
  const [mode, setMode] = useState<CreationMode | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [aiPrompt, setAiPrompt] = useState('')

  const createMutation = useMutation({
    mutationFn: createDashboard,
    onSuccess: (data) => {
      toast.success('Dashboard created!')
      router.push(`/dashboards/${data.id}?edit=true`)
    },
    onError: () => toast.error('Failed to create dashboard'),
  })

  const generateMutation = useMutation({
    mutationFn: generateWithAI,
    onSuccess: (data) => {
      toast.success('Dashboard generated!')
      router.push(`/dashboards/${data.id}?edit=true`)
    },
    onError: () => toast.error('AI generation failed'),
  })

  if (mode === 'template') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setMode(null)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Choose a Template</h1>
            <p className="text-sm text-muted-foreground">Start from a pre-built dashboard</p>
          </div>
        </div>
        <TemplateGallery
          onSelect={(templateId, templateName) => {
            createMutation.mutate({
              name: templateName,
              templateId,
            })
          }}
        />
      </div>
    )
  }

  if (mode === 'blank') {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setMode(null)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">New Dashboard</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Dashboard Details</CardTitle>
            <CardDescription>Give your dashboard a name to get started.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g. Sales Overview, Operations KPIs"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Optional description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                className="flex-1"
                disabled={!name.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate({ name: name.trim(), description })}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Dashboard'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (mode === 'ai') {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setMode(null)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">AI Dashboard Generator</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Describe Your Dashboard
            </CardTitle>
            <CardDescription>
              Describe what you want to visualize and our AI will create a dashboard for you.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prompt">What would you like to build?</Label>
              <textarea
                id="prompt"
                className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                placeholder="e.g. An executive KPI dashboard showing revenue, churn, NPS and team headcount with weekly trends"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                autoFocus
              />
            </div>
            <Button
              className="w-full"
              disabled={!aiPrompt.trim() || generateMutation.isPending}
              onClick={() => generateMutation.mutate(aiPrompt.trim())}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {generateMutation.isPending ? 'Generating...' : 'Generate Dashboard'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Mode selection
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboards">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create a Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Choose how to get started</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className="cursor-pointer hover:shadow-md hover:border-primary/50 transition-all duration-200"
          onClick={() => setMode('blank')}
        >
          <CardContent className="pt-8 pb-8 text-center space-y-3">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Plus className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Blank Canvas</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Start with an empty dashboard and build from scratch
              </p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md hover:border-primary/50 transition-all duration-200"
          onClick={() => setMode('template')}
        >
          <CardContent className="pt-8 pb-8 text-center space-y-3">
            <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto">
              <LayoutDashboard className="h-7 w-7 text-indigo-500" />
            </div>
            <div>
              <h3 className="font-semibold">From Template</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Choose from 10+ pre-built dashboard templates
              </p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md hover:border-primary/50 transition-all duration-200"
          onClick={() => setMode('ai')}
        >
          <CardContent className="pt-8 pb-8 text-center space-y-3">
            <div className="h-14 w-14 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto">
              <Sparkles className="h-7 w-7 text-violet-500" />
            </div>
            <div>
              <h3 className="font-semibold">AI Generator</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Describe what you need and let AI build it for you
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
