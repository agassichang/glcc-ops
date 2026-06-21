import { supabase, supabaseConfigured } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Edit an influencer's tier and/or referral code. Login-gated by middleware
// (only signed-in users reach it). Scoped to category = 'influencer' so it can
// never touch any other tab's data.
export async function POST(req: Request) {
  if (!supabaseConfigured) {
    return Response.json({ ok: false, reason: 'supabase_not_configured' }, { status: 500 })
  }
  let body: any
  try { body = await req.json() } catch { return Response.json({ ok: false, reason: 'bad_json' }, { status: 400 }) }

  const id = Number(body?.id)
  if (!Number.isInteger(id)) return Response.json({ ok: false, reason: 'bad_id' }, { status: 400 })

  const { data: row, error: selErr } = await supabase
    .from('records').select('meta, category').eq('id', id).single()
  if (selErr || !row) return Response.json({ ok: false, reason: 'not_found' }, { status: 404 })
  if (row.category !== 'influencer') return Response.json({ ok: false, reason: 'not_influencer' }, { status: 400 })

  const meta = { ...(row.meta ?? {}) }

  if ('tier' in body) {
    const raw = body.tier
    const tier = raw === null || raw === '' || raw === undefined ? null : Number(raw)
    if (tier !== null && ![1, 2, 3].includes(tier)) return Response.json({ ok: false, reason: 'bad_tier' }, { status: 400 })
    if (tier === null) delete meta.tier
    else meta.tier = tier
  }

  if ('referralCode' in body) {
    const code = String(body.referralCode ?? '').trim().slice(0, 64)
    if (code) meta.referral_code = code
    else delete meta.referral_code
  }

  const patch: Record<string, any> = { meta }
  if ('name' in body) {
    const name = String(body.name ?? '').trim().slice(0, 200)
    if (!name) return Response.json({ ok: false, reason: 'bad_name' }, { status: 400 })
    patch.title = name
  }

  const { error: updErr } = await supabase.from('records').update(patch).eq('id', id)
  if (updErr) return Response.json({ ok: false, reason: 'update_failed', error: updErr.message }, { status: 500 })

  return Response.json({ ok: true, id, name: patch.title, tier: meta.tier ?? null, referralCode: meta.referral_code ?? null })
}
