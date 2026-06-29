import { NextResponse, type NextRequest } from 'next/server'
import { AUTH_COOKIE, expectedToken } from '@/lib/auth'

// Paths reachable WITHOUT logging in: the login flow itself, plus the
// webhook/cron endpoints (they authenticate via their own secrets and are
// called by Telegram / Vercel Cron, which have no login cookie).
const OPEN = [
  '/login',
  '/api/login',
  '/api/logout',
  '/api/telegram',
  '/api/digest',
  '/api/jarvis-oyen',
  '/api/shopify-sales',
  '/api/sync-influencers',
  // Public guest check-in (the staff dashboard /staff stays gated).
  '/checkin',
  '/api/event/checkin',
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Static assets in /public (images, fonts, etc.) are always public — never
  // gate them, or things like the check-in page's header image get redirected
  // to /login and fail to load.
  if (/\.(png|jpe?g|gif|svg|webp|avif|ico|css|js|mjs|woff2?|ttf|otf|map|txt|xml|json|webmanifest)$/i.test(pathname)) {
    return NextResponse.next()
  }

  if (OPEN.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  // Fail open until a password is configured, so deploying this never locks
  // anyone out. The gate turns on the moment APP_PASSWORD is set.
  const expected = await expectedToken()
  if (!expected) return NextResponse.next()

  const token = req.cookies.get(AUTH_COOKIE)?.value
  if (token && token === expected) return NextResponse.next()

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 })
  }
  const url = req.nextUrl.clone()
  url.pathname = '/login'
  url.searchParams.set('next', pathname)
  return NextResponse.redirect(url)
}

// Run on everything except Next internals and the favicon.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
