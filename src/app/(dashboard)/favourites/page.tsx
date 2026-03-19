import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatRelativeTime } from '@/lib/utils'
import { Star, BarChart3, LayoutDashboard, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface FavouriteReport {
  id: string
  createdAt: Date
  report: {
    id: string
    name: string
    description: string | null
    type: string
    updatedAt: Date
    visibility: string
  }
  dashboard: null
}

interface FavouriteDashboard {
  id: string
  createdAt: Date
  report: null
  dashboard: {
    id: string
    name: string
    description: string | null
    updatedAt: Date
    visibility: string
  }
}

type FavouriteItem = FavouriteReport | FavouriteDashboard

interface FavouritesData {
  reportFavourites: FavouriteReport[]
  dashboardFavourites: FavouriteDashboard[]
}

async function getFavourites(userId: string): Promise<FavouritesData> {
  const all = await prisma.ifFavourite.findMany({
    where: { userId },
    include: {
      report: {
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          updatedAt: true,
          visibility: true,
          deletedAt: true,
        },
      },
      dashboard: {
        select: {
          id: true,
          name: true,
          description: true,
          updatedAt: true,
          visibility: true,
          deletedAt: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const reportFavourites = all
    .filter((f) => f.report !== null && f.report.deletedAt === null)
    .map((f) => ({
      id: f.id,
      createdAt: f.createdAt,
      report: {
        id: f.report!.id,
        name: f.report!.name,
        description: f.report!.description,
        type: f.report!.type,
        updatedAt: f.report!.updatedAt,
        visibility: f.report!.visibility,
      },
      dashboard: null,
    })) as FavouriteReport[]

  const dashboardFavourites = all
    .filter((f) => f.dashboard !== null && f.dashboard.deletedAt === null)
    .map((f) => ({
      id: f.id,
      createdAt: f.createdAt,
      report: null,
      dashboard: {
        id: f.dashboard!.id,
        name: f.dashboard!.name,
        description: f.dashboard!.description,
        updatedAt: f.dashboard!.updatedAt,
        visibility: f.dashboard!.visibility,
      },
    })) as FavouriteDashboard[]

  return { reportFavourites, dashboardFavourites }
}

function ReportCard({ fav }: { fav: FavouriteReport }) {
  return (
    <Link href={`/reports/${fav.report.id}`} className="block group">
      <Card className="hover:shadow-md transition-shadow hover:border-primary/40">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold truncate text-sm group-hover:text-primary transition-colors">
                  {fav.report.name}
                </p>
                <Badge variant="secondary" className="text-xs capitalize shrink-0">
                  {fav.report.type.replace('_', ' ')}
                </Badge>
              </div>
              {fav.report.description && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {fav.report.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1.5">
                Updated {formatRelativeTime(fav.report.updatedAt)}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function DashboardCard({ fav }: { fav: FavouriteDashboard }) {
  return (
    <Link href={`/dashboards/${fav.dashboard.id}`} className="block group">
      <Card className="hover:shadow-md transition-shadow hover:border-primary/40">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
              <LayoutDashboard className="h-4 w-4 text-blue-500" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold truncate text-sm group-hover:text-primary transition-colors">
                  {fav.dashboard.name}
                </p>
                <Badge variant="outline" className="text-xs capitalize shrink-0">
                  {fav.dashboard.visibility}
                </Badge>
              </div>
              {fav.dashboard.description && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {fav.dashboard.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1.5">
                Updated {formatRelativeTime(fav.dashboard.updatedAt)}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export default async function FavouritesPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const userId = session.user.id
  const { reportFavourites, dashboardFavourites } = await getFavourites(userId)

  const totalCount = reportFavourites.length + dashboardFavourites.length

  if (totalCount === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Favourites</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your starred reports and dashboards
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Star className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No favourites yet</h3>
          <p className="mb-6 mt-1 max-w-sm text-sm text-muted-foreground">
            Star reports and dashboards to quickly access them here. Look for the star icon when
            viewing any report or dashboard.
          </p>
          <div className="flex gap-3">
            <Link
              href="/reports"
              className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              <BarChart3 className="h-4 w-4" />
              Browse Reports
            </Link>
            <Link
              href="/dashboards"
              className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              <LayoutDashboard className="h-4 w-4" />
              Browse Dashboards
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Favourites</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your starred reports and dashboards · {totalCount} item{totalCount !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Reports section */}
      {reportFavourites.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Reports
            </h2>
            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">
              {reportFavourites.length}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {reportFavourites.map((fav) => (
              <ReportCard key={fav.id} fav={fav} />
            ))}
          </div>
        </section>
      )}

      {/* Dashboards section */}
      {dashboardFavourites.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Dashboards
            </h2>
            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">
              {dashboardFavourites.length}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dashboardFavourites.map((fav) => (
              <DashboardCard key={fav.id} fav={fav} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
