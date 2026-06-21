import { supabase, supabaseConfigured } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Set a KOL's tier (1/2/3, or null to clear). Writes meta.tier on a single
// influencer row using the server-side service_role. Scoped to category =
// 'influencer' so it can never modify any other tab's data.
export async function POST(req: Request) {
  if (!supabaseConfigured) {
    return Response.json({ ok: false, reason: 'supabase_not_configured' }, { status: 500 })
  }
  let body: any
  try { body = await req.json() } catch { return Response.json({ ok: false, reason: 'bad_json' }, { status: 400 }) }

  const id = Number(body?.id)
  if (!Number.isInteger(id)) return Response.json({ ok: false, reason: 'bad_id' }, { status: 400 })

  const raw = body?.tier
  const tier = raw === null || raw === '' || raw === undefined ? null : Number(raw)
  if (tier !== null && ![1, 2, 3].includes(tier)) {
    return Response.json({ ok: false, reason: 'bad_tier' }, { status: 400 })
  }

  const { data: row, error: selErr } = await supabase
    .from('records').select('meta, category').eq('id', id).single()
  if (selErr || !row) return Response.json({ ok: false, reason: 'not_found' }, { status: 404 })
  if (row.category !== 'influencer') {
    return Response.json({ ok: false, reason: 'not_influencer' }, { status: 400 })
  }

  const meta = { ...(row.meta ?? {}) }
  if (tier === null) delete meta.tier
  else meta.tier = tier

  const { error: updErr } = await supabase.from('records').update({ meta }).eq('id', id)
  if (updErr) return Response.json({ ok: false, reason: 'update_failed', error: updErr.message }, { status: 500 })

  return Response.json({ ok: true, id, tier })
}
