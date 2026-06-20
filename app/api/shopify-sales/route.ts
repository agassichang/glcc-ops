import { sendMessage } from '@/lib/telegram'

export const dynamic = 'force-dynamic'

// Shopify daily sales report 🛍️ — replaces the manual "check yesterday's sales" step.
//   • Daily Vercel cron  → GET with Bearer CRON_SECRET (queries Shopify, sends Telegram)
//   • Anything else      → a no-secret status check (no Shopify call, no send)
// Sending FAILS CLOSED without CRON_SECRET, identical to the jarvis-oyen route.
//
// Connects to the Shopify Admin GraphQL API with a custom-app token. Needs:
//   SHOPIFY_STORE_DOMAIN  e.g. your-store.myshopify.com
//   SHOPIFY_ADMIN_TOKEN   custom-app Admin API token (shpat_…), scope: read_orders

// Your timezone offset from UTC, in hours. 9am cron (0 1 * * * UTC) = 9am at UTC+8.
const TZ_OFFSET_HOURS = 8
// Pinned Admin API version so a future Shopify release can't change behavior silently.
const API_VERSION = '2025-07'

// Returns yesterday's window in *local* time, as ISO strings carrying the offset,
// so Shopify filters orders by the same calendar day you'd see in the admin.
function yesterdayWindow() {
  const sign = TZ_OFFSET_HOURS >= 0 ? '+' : '-'
  const off = `${sign}${String(Math.abs(TZ_OFFSET_HOURS)).padStart(2, '0')}:00`
  const localNow = new Date(Date.now() + TZ_OFFSET_HOURS * 3600_000)
  const ymd = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
  const yesterday = new Date(localNow.getTime() - 86_400_000)
  return {
    label: ymd(yesterday),
    start: `${ymd(yesterday)}T00:00:00${off}`,
    end: `${ymd(localNow)}T00:00:00${off}`,
  }
}

type SalesSummary = { count: number; total: number; currency: string }

async function fetchYesterdaySales(): Promise<SalesSummary | null> {
  const domain = process.env.SHOPIFY_STORE_DOMAIN?.trim()
  const token = process.env.SHOPIFY_ADMIN_TOKEN?.trim()
  if (!domain || !token) {
    console.error('[GLCC] Shopify creds not set (SHOPIFY_STORE_DOMAIN / SHOPIFY_ADMIN_TOKEN).')
    return null
  }
  const { start, end } = yesterdayWindow()
  const query = `query($q: String!, $cursor: String) {
    orders(first: 250, query: $q, after: $cursor, sortKey: CREATED_AT) {
      edges { cursor node { currentTotalPriceSet { shopMoney { amount currencyCode } } } }
      pageInfo { hasNextPage }
    }
  }`
  const q = `created_at:>='${start}' AND created_at:<'${end}'`

  let cursor: string | null = null
  let count = 0
  let total = 0
  let currency = ''
  // Bound the loop so a huge day can't run forever; 250×20 = 5000 orders.
  for (let page = 0; page < 20; page++) {
    const res: Response = await fetch(`https://${domain}/admin/api/${API_VERSION}/graphql.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
      body: JSON.stringify({ query, variables: { q, cursor } }),
    })
    if (!res.ok) {
      console.error('[GLCC] Shopify HTTP error:', res.status, await res.text().catch(() => ''))
      return null
    }
    const json: any = await res.json()
    if (json.errors) {
      console.error('[GLCC] Shopify GraphQL error:', JSON.stringify(json.errors))
      return null
    }
    const conn = json.data?.orders
    for (const edge of conn?.edges ?? []) {
      const money = edge.node?.currentTotalPriceSet?.shopMoney
      if (!money) continue
      count++
      total += parseFloat(money.amount) || 0
      currency ||= money.currencyCode
    }
    if (!conn?.pageInfo?.hasNextPage) break
    cursor = conn.edges[conn.edges.length - 1]?.cursor ?? null
    if (!cursor) break
  }
  return { count, total, currency: currency || 'USD' }
}

function formatReport(s: SalesSummary, label: string): string {
  const money = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: s.currency }).format(n)
  if (s.count === 0) return `🛍️ <b>Sales yesterday (${label})</b>\n\nNo orders.`
  const avg = s.total / s.count
  return (
    `🛍️ <b>Sales yesterday (${label})</b>\n\n` +
    `Total: <b>${money(s.total)}</b>\n` +
    `Orders: <b>${s.count}</b>\n` +
    `Avg order: <b>${money(avg)}</b>`
  )
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const authed = !!secret && req.headers.get('authorization') === `Bearer ${secret}`

  // The daily Vercel cron (authenticated) — query Shopify + send to the owner.
  if (authed) {
    const { label } = yesterdayWindow()
    const summary = await fetchYesterdaySales()
    if (!summary) return Response.json({ ok: false, reason: 'shopify_error' })
    const owner = process.env.OWNER_CHAT_ID?.trim()
    if (!owner) return Response.json({ ok: false, reason: 'no_owner_chat_id' })
    await sendMessage(owner, formatReport(summary, label))
    return Response.json({ ok: true, sent: true, ...summary })
  }

  // No-secret status check (no secrets leaked, no Shopify call, no send).
  return Response.json({
    ok: true,
    shopifyConfigured: !!(process.env.SHOPIFY_STORE_DOMAIN && process.env.SHOPIFY_ADMIN_TOKEN),
    ownerSet: !!process.env.OWNER_CHAT_ID,
    note: 'Sending is cron-only (requires Bearer CRON_SECRET).',
  })
}
