import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { mockData } from './data.js'
import { scoreTechnical, scoreCommercial, computeBreakdown, applyFilters } from './scoring.js'
import type { TechWeights, CommWeights, HardFilters } from './scoring.js'

const app = Fastify({ logger: true })

await app.register(cors, { origin: true })
await app.register(jwt, { secret: process.env.JWT_SECRET || 'dev-secret-change-me' })

// --- Auth ---
const MOCK_USER = { id: 'user-001', email: 'analyst@lumen.energy', name: 'Demo Analyst', role: 'analyst' as const }
const MOCK_PASSWORD = 'Lumen2026'

app.post('/api/auth/login', async (request, reply) => {
  const { password } = request.body as { email?: string; password: string }
  if (password === MOCK_PASSWORD) {
    const token = app.jwt.sign({ sub: MOCK_USER.id, email: MOCK_USER.email, role: MOCK_USER.role })
    return { token, user: MOCK_USER }
  }
  return reply.status(401).send({ error: 'Invalid credentials' })
})

app.get('/api/auth/me', async (request, reply) => {
  try {
    await request.jwtVerify()
    return { user: MOCK_USER }
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' })
  }
})

// --- Helper: parse query params ---
function parseParams(query: Record<string, unknown>) {
  const num = (k: string, def: number) => { const v = query[k]; return v != null ? Number(v) : def }
  const bool = (k: string, def: boolean) => { const v = query[k]; if (v === 'true') return true; if (v === 'false') return false; return def }

  const techWeights: TechWeights = { area: num('w_area', 0.25), substation: num('w_substation', 0.25), hosting: num('w_hosting', 0.20), flood: num('w_flood', 0.15), wetland: num('w_wetland', 0.10), zoning: num('w_zoning_tech', 0.05) }
  const commWeights: CommWeights = { ira: num('w_ira', 0.30), miso: num('w_miso', 0.20), ceja: num('w_ceja', 0.20), brownfield: num('w_brownfield', 0.15), zoning: num('w_zoning_comm', 0.10), enterprise: num('w_enterprise', 0.05) }
  const hardFilters: HardFilters = { exclude_high_flood: bool('exclude_high_flood', true), min_developable_area: bool('min_developable_area', true), exclude_zoning_no: bool('exclude_zoning_no', false), require_hosting_data: bool('require_hosting_data', false), require_ira_adder: bool('require_ira_adder', false), require_ej_community: bool('require_ej_community', false), require_brownfield: bool('require_brownfield', false) }
  const techWeight = num('tech_weight', 0.5)
  const page = Math.max(1, num('page', 1))
  const limit = Math.min(200, Math.max(1, num('limit', 50)))
  const sortBy = (query.sort_by as string) || 'composite_score'
  const sortDir = (query.sort_dir as string) === 'asc' ? 'asc' as const : 'desc' as const

  return { techWeights, commWeights, hardFilters, techWeight, page, limit, sortBy, sortDir }
}

// --- Sites ---
app.get('/api/sites', async (request) => {
  const q = request.query as Record<string, unknown>
  const { techWeights, commWeights, hardFilters, techWeight, page, limit, sortBy, sortDir } = parseParams(q)

  const filtered = mockData.filter((d) => applyFilters(d.enrichment, hardFilters))

  const scored = filtered.map((d) => {
    const breakdown = computeBreakdown(d.enrichment, techWeights, commWeights, techWeight)
    return { ...d.site, enrichment: d.enrichment, technical_score: breakdown.technical.total, commercial_score: breakdown.commercial.total, composite_score: breakdown.composite, score_breakdown: breakdown }
  })

  scored.sort((a, b) => {
    let av: number, bv: number
    switch (sortBy) {
      case 'technical_score': av = a.technical_score; bv = b.technical_score; break
      case 'commercial_score': av = a.commercial_score; bv = b.commercial_score; break
      case 'developable_area_acres': av = a.enrichment.developable_area_acres; bv = b.enrichment.developable_area_acres; break
      case 'nearest_substation_dist_mi': av = a.enrichment.nearest_substation_dist_mi; bv = b.enrichment.nearest_substation_dist_mi; break
      default: av = a.composite_score; bv = b.composite_score
    }
    return sortDir === 'desc' ? bv - av : av - bv
  })

  const total = scored.length
  const pages = Math.ceil(total / limit)
  const start = (page - 1) * limit
  const sites = scored.slice(start, start + limit).map((s, i) => ({ ...s, rank: start + i + 1 }))

  const scores = scored.map((s) => s.composite_score)
  const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / (arr.length || 1)
  const p75 = (arr: number[]) => { const sorted = [...arr].sort((a, b) => a - b); return sorted[Math.floor(sorted.length * 0.75)] || 0 }

  return {
    sites,
    total,
    filtered: mockData.length,
    page,
    pages,
    score_stats: {
      composite_mean: Math.round(mean(scores) * 10) / 10,
      composite_p75: Math.round(p75(scores) * 10) / 10,
      technical_mean: Math.round(mean(scored.map((s) => s.technical_score)) * 10) / 10,
      commercial_mean: Math.round(mean(scored.map((s) => s.commercial_score)) * 10) / 10,
    },
  }
})

app.get('/api/sites/:id', async (request, reply) => {
  const { id } = request.params as { id: string }
  const q = request.query as Record<string, unknown>
  const { techWeights, commWeights, techWeight } = parseParams(q)

  const found = mockData.find((d) => d.site.id === id)
  if (!found) return reply.status(404).send({ error: 'Site not found' })

  const breakdown = computeBreakdown(found.enrichment, techWeights, commWeights, techWeight)

  return {
    ...found.site,
    enrichment: found.enrichment,
    technical_score: breakdown.technical.total,
    commercial_score: breakdown.commercial.total,
    composite_score: breakdown.composite,
    score_breakdown: breakdown,
  }
})

// --- CSV Export ---
app.get('/api/sites/export/csv', async (request, reply) => {
  const q = request.query as Record<string, unknown>
  const { techWeights, commWeights, hardFilters, techWeight, sortBy, sortDir } = parseParams(q)

  const filtered = mockData.filter((d) => applyFilters(d.enrichment, hardFilters))

  const scored = filtered.map((d) => {
    const b = computeBreakdown(d.enrichment, techWeights, commWeights, techWeight)
    return { ...d.site, e: d.enrichment, tech: b.technical.total, comm: b.commercial.total, comp: b.composite }
  })

  scored.sort((a, b) => {
    const av = sortBy === 'technical_score' ? a.tech : sortBy === 'commercial_score' ? a.comm : a.comp
    const bv = sortBy === 'technical_score' ? b.tech : sortBy === 'commercial_score' ? b.comm : b.comp
    return sortDir === 'desc' ? bv - av : av - bv
  })

  const headers = ['Rank','ID','Name','Address','City','State','ZIP','Building Type','Utility','Composite Score','Technical Score','Commercial Score','Developable Area (ac)','Substation Distance (mi)','Hosting Capacity','Flood Zone','IRA Energy Community','EJ Community','Brownfield','Zoning']
  const rows = scored.map((s, i) =>
    [i + 1, s.external_id, `"${s.name}"`, `"${s.address}"`, s.city, s.state, s.zip, `"${s.building_type}"`, `"${s.utility_name}"`, s.comp, s.tech, s.comm, s.e.developable_area_acres, s.e.nearest_substation_dist_mi, s.e.hosting_capacity_tier, s.e.fema_flood_zone, s.e.ira_energy_community, s.e.ceja_ej_community, s.e.epa_brownfield, s.e.zoning_compatible].join(',')
  )

  const csv = [headers.join(','), ...rows].join('\n')

  reply.header('Content-Type', 'text/csv')
  reply.header('Content-Disposition', 'attachment; filename="fom-sites-export.csv"')
  return csv
})

// --- Start ---
const port = Number(process.env.PORT) || 3001
app.listen({ port, host: '0.0.0.0' }, (err) => {
  if (err) { app.log.error(err); process.exit(1) }
  console.log(`API running on http://localhost:${port}`)
})
