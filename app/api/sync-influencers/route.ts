import { supabase, supabaseConfigured } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Pull the influencer roster from a Google Sheet exported as CSV — no OAuth.
//   Set INFLUENCER_SHEET_CSV_URL in .env (+ Vercel) to the sheet's CSV export:
//   https://docs.google.com/spreadsheets/d/<ID>/export?format=csv&gid=<GID>
//   (works when the sheet is shared "Anyone with the link: Viewer", or Published.)
//
// PRIVACY: this app has no auth, so the dashboard is public. We import ONLY
// marketing-safe fields (name + public social handles + join date + referral
// code). We deliberately NEVER read phone, DOB, email, shipping address, or any
// body-measurement columns, even though they exist in the sheet.
//
// The sheet is the source of truth: each run replaces ONLY category='influencer'
// rows — it never reads or writes any other tab's data.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('forbidden', { status: 401 })
  }
  if (!supabaseConfigured) {
    return Response.json({ ok: false, reason: 'supabase_not_configured' }, { status: 500 })
  }
  const url = process.env.INFLUENCER_SHEET_CSV_URL?.trim()
  if (!url) {
    return Response.json({ ok: false, reason: 'no_sheet_url', hint: 'Add INFLUENCER_SHEET_CSV_URL to .env' }, { status: 400 })
  }

  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok) {
    return Response.json({ ok: false, reason: 'fetch_failed', status: res.status }, { status: 502 })
  }
  const parsed = parseCsv(await res.text())

  // Pull ONLY these safe columns. Anything not listed here (phone, DOB, email,
  // address, height, weight, measurements…) is never touched.
  const clean = (v?: string) => {
    const s = (v ?? '').trim()
    return s === '-' ? '' : s
  }
  const records = parsed
    .map(r => ({
      title: clean(r['name']),
      status: 'active',
      amount: 0,
      category: 'influencer',
      due_date: null,
      meta: {
        instagram: clean(r['instagram']),
        facebook: clean(r['facebook']),
        red: clean(r['小红书']),
        tiktok: clean(r['tik tok']),
        youtube: clean(r['youtube']),
        join_date: clean(r['join date']),
        referral_code: clean(r['referral code']),
      },
    }))
    .filter(r => r.title)

  if (records.length === 0) {
    return Response.json({ ok: false, reason: 'no_rows', hint: 'Check the sheet has a header row with a "Name" column' }, { status: 400 })
  }

  // Replace only the influencer rows (scoped delete → fresh insert).
  const { error: delErr } = await supabase.from('records').delete().eq('category', 'influencer')
  if (delErr) return Response.json({ ok: false, reason: 'delete_failed', error: delErr.message }, { status: 500 })
  const { error: insErr } = await supabase.from('records').insert(records)
  if (insErr) return Response.json({ ok: false, reason: 'insert_failed', error: insErr.message }, { status: 500 })

  return Response.json({ ok: true, synced: records.length })
}

// Minimal CSV parser: handles quoted fields, escaped quotes, commas, and CRLF.
// Returns an array of objects keyed by the lowercased, trimmed header row.
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let field = '', row: string[] = [], inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else inQuotes = false
      } else field += c
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field); field = ''
    } else if (c === '\n') {
      row.push(field); rows.push(row); field = ''; row = []
    } else if (c !== '\r') {
      field += c
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }

  const header = (rows.shift() ?? []).map(h => h.trim().toLowerCase())
  return rows
    .filter(r => r.some(c => c.trim() !== ''))
    .map(r => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])))
}
