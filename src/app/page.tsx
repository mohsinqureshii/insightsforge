import Link from 'next/link'
import { ArrowRight, BarChart3, Database, Globe, Lock, Sparkles, Zap } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950/20 to-slate-950 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold">InsightForge</span>
            </div>
            <div className="hidden items-center gap-8 md:flex">
              <Link href="#features" className="text-sm text-slate-300 transition hover:text-white">
                Features
              </Link>
              <Link href="#pricing" className="text-sm text-slate-300 transition hover:text-white">
                Pricing
              </Link>
              <Link href="#docs" className="text-sm text-slate-300 transition hover:text-white">
                Docs
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm text-slate-300 transition hover:text-white"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500"
              >
                Get started free
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex min-h-screen flex-col items-center justify-center px-4 pt-16 text-center">
        <div className="mx-auto max-w-4xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary-500/30 bg-primary-500/10 px-4 py-1.5 text-sm text-primary-300">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI-powered analytics for modern teams</span>
          </div>
          <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
            Turn raw data into{' '}
            <span className="bg-gradient-to-r from-primary-400 to-purple-400 bg-clip-text text-transparent">
              powerful insights
            </span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-slate-400">
            InsightForge is the all-in-one analytics platform for SaaS teams. Connect your databases,
            build beautiful dashboards, and share insights — all without writing a single line of code.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="flex items-center gap-2 rounded-xl bg-primary-600 px-8 py-4 text-base font-semibold text-white transition hover:bg-primary-500 hover:shadow-glow-purple"
            >
              Start for free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#features"
              className="rounded-xl border border-white/10 bg-white/5 px-8 py-4 text-base font-semibold text-white transition hover:bg-white/10"
            >
              See how it works
            </Link>
          </div>
          <p className="mt-4 text-sm text-slate-500">No credit card required · 14-day free trial</p>
        </div>

        {/* Dashboard preview placeholder */}
        <div className="mt-16 w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 p-1 shadow-2xl">
          <div className="rounded-xl bg-slate-900 p-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500/70" />
              <div className="h-3 w-3 rounded-full bg-yellow-500/70" />
              <div className="h-3 w-3 rounded-full bg-green-500/70" />
              <div className="ml-4 h-5 w-48 rounded-md bg-slate-700/50" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Total Revenue', value: '$128,540', change: '+12.5%' },
                { label: 'Active Users', value: '8,324', change: '+8.2%' },
                { label: 'Conversion Rate', value: '3.47%', change: '+0.3%' },
              ].map((metric) => (
                <div key={metric.label} className="rounded-lg bg-slate-800/50 p-4">
                  <div className="mb-1 text-xs text-slate-400">{metric.label}</div>
                  <div className="text-2xl font-bold text-white">{metric.value}</div>
                  <div className="text-xs text-green-400">{metric.change}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 h-40 rounded-lg bg-slate-800/50" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold">Everything you need to understand your data</h2>
            <p className="mx-auto max-w-2xl text-lg text-slate-400">
              From connecting data sources to sharing with stakeholders, InsightForge handles the entire analytics workflow.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Database,
                title: 'Universal Connectors',
                description:
                  'Connect to PostgreSQL, MySQL, BigQuery, Snowflake, Redshift, and more — in minutes.',
              },
              {
                icon: BarChart3,
                title: 'Rich Visualisations',
                description:
                  'Build stunning charts, tables, and dashboards with our drag-and-drop editor.',
              },
              {
                icon: Sparkles,
                title: 'AI-Powered Insights',
                description:
                  'Ask questions in plain English and let our AI generate the SQL and insights for you.',
              },
              {
                icon: Globe,
                title: 'Easy Sharing',
                description:
                  'Share dashboards via secure links, schedule email reports, or embed in your product.',
              },
              {
                icon: Lock,
                title: 'Enterprise Security',
                description:
                  'SSO, MFA, RBAC, audit logs, and end-to-end encryption for peace of mind.',
              },
              {
                icon: Zap,
                title: 'Real-time & Scheduled',
                description:
                  'Live data refresh and automated delivery to keep your team always up to date.',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-primary-500/30 hover:bg-white/8"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500/20">
                  <feature.icon className="h-5 w-5 text-primary-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-slate-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="mb-4 text-4xl font-bold">Ready to forge your insights?</h2>
          <p className="mb-8 text-lg text-slate-400">
            Join thousands of teams already using InsightForge to make data-driven decisions.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-8 py-4 text-base font-semibold text-white transition hover:bg-primary-500"
          >
            Get started for free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-slate-500">
          <p>© {new Date().getFullYear()} InsightForge. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
