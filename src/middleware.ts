import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/api/auth',
  '/api/health',
  '/s/', // shared public links
]

// API routes that use API key auth instead of session auth
const API_KEY_ROUTES = ['/api/v1/']

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => {
    if (route.endsWith('/')) {
      return pathname.startsWith(route) || pathname === route.slice(0, -1)
    }
    return pathname === route || pathname.startsWith(route + '/')
  })
}

function isApiKeyRoute(pathname: string): boolean {
  return API_KEY_ROUTES.some((route) => pathname.startsWith(route))
}

function buildCsp(): string {
  const directives: string[] = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // unsafe-eval needed for ECharts
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ]
  return directives.join('; ')
}

export default auth(async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl
  const session = (req as unknown as { auth: { user?: { id: string } } | null }).auth

  // Allow public routes
  if (isPublicRoute(pathname)) {
    // Redirect authenticated users away from auth pages
    if (session?.user && ['/login', '/register'].includes(pathname)) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return NextResponse.next()
  }

  // API routes with API key auth
  if (isApiKeyRoute(pathname)) {
    const authHeader = req.headers.get('authorization')
    const apiKey = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    const queryKey = searchParams.get('api_key')
    const key = apiKey ?? queryKey

    if (key?.startsWith('if_live_')) {
      // API key validation happens in route handlers
      return NextResponse.next()
    }

    // Fall through to session auth for API routes
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 },
      )
    }

    return NextResponse.next()
  }

  // Require session for all other routes
  if (!session?.user) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', req.url)
    return NextResponse.redirect(loginUrl)
  }

  // Build response with security + tenant headers
  const response = NextResponse.next()

  const activeTenantId = (session as unknown as { activeTenantId?: string }).activeTenantId
  if (activeTenantId) {
    response.headers.set('X-Tenant-ID', activeTenantId)
  }

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '0') // Disabled in favour of CSP
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  )
  response.headers.set('Content-Security-Policy', buildCsp())

  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload',
    )
  }

  return response
})

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
