# FOM Battery Site Screening Tool — ComEd Territory
## Product Requirements Document v1.0 | Build-Ready for Claude Code

---

## 0. Document Purpose

This PRD is the authoritative specification for building the Lumen Energy FOM Battery Site Screening Tool in Claude Code. It covers all three phases (Phase 1 MVP, Phase 2 Full Enrichment, Phase 3 Collaboration). Every section is written to be directly actionable — data models, API contracts, scoring logic, and UI specifications are precise enough to generate code from directly.

---

## 1. Product Overview

A web-based internal tool for Lumen Energy analysts to screen, score, and rank commercial building sites in **ComEd territory (northern Illinois)** for front-of-the-meter (FOM) battery storage development suitability. The tool enriches a proprietary site database with 10+ spatial and market datasets, then ranks sites on two independently weighted scores: **Technical Viability** and **Commercial Viability**.

**Key characteristics:**
- 1,000–10,000 commercial sites in ComEd IL territory
- 10–50 internal users
- Map-first UI with synchronized ranked table
- All external data pre-processed into a PostGIS enrichment database (no live API calls at query time, except for Mapbox tile rendering)
- Scores computed dynamically in PostgreSQL based on user-selected weights
- Lumen Energy brand identity throughout

---

## 2. Brand & Design System

Apply Lumen Energy brand guidelines to all UI components. Claude Code must use the following tokens.

### 2.1 Color Tokens (Tailwind CSS)

```css
:root {
  --lumen-white: #FFFFFF;
  --lumen-black: #1A1A1A;
  --lumen-sky-blue: #B1E5FF;
  --lumen-sky-blue-100: #CAEDFF;
  --lumen-sky-blue-400: #77AFD7;
  --lumen-sky-blue-500: #68A2CD;
  --lumen-electric-yellow: #DFFF5E;
  --lumen-electric-yellow-tint: #ECFFB2;
  --lumen-concrete: #9FA38F;
  --lumen-concrete-100: #E7E8E3;
  --lumen-concrete-200: #CFD1C7;
  --lumen-graphite-100: #656565;
}
```

### 2.2 Typography

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Roboto+Mono&display=swap" rel="stylesheet">
```

| Role | Font | Fallback |
|---|---|---|
| Display/Headlines | ABC Arizona Serif | Times, serif |
| Body / UI | ABC Pelikan | Inter, system-ui |
| Monospace / Data | ABC Pelikan Mono | Roboto Mono |

### 2.3 Component Patterns

- **Primary buttons:** Sky Blue (`#B1E5FF`) background, Graphite Black text
- **CTA / accent buttons:** Electric Yellow (`#DFFF5E`) background, Graphite Black text
- **Secondary buttons:** White background, Concrete border, Graphite text
- **Cards:** White background, `#E7E8E3` (Concrete-100) border, 8px border-radius
- **Data highlight cells:** Electric Yellow tint (`#ECFFB2`) background
- **Score bars:** Sky Blue fill on Concrete-100 track
- **High score badges:** Electric Yellow background
- **Risk/fail badges:** use `#FF6B6B` (red is acceptable as a functional signal color, not brand)
- **Page background:** `#FFFFFF` with `#E7E8E3` sidebar/panel backgrounds
- **Nav/header:** Graphite Black (`#1A1A1A`) background, white Lumen logo

### 2.4 Logo

Use `logo-white.svg` in the dark nav header. Use `logo-black.svg` on white backgrounds (e.g., PDF exports, login page).

### 2.5 Tailwind Config

```js
// tailwind.config.js — use this exact config
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['ABC Arizona Serif', 'Times', 'serif'],
        sans: ['ABC Pelikan', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['ABC Pelikan Mono', 'Roboto Mono', 'monospace'],
      },
      colors: {
        lumen: {
          'sky-blue': '#B1E5FF',
          'sky-blue-100': '#CAEDFF',
          'sky-blue-400': '#77AFD7',
          'sky-blue-500': '#68A2CD',
          'electric-yellow': '#DFFF5E',
          'electric-yellow-tint': '#ECFFB2',
          'electric-yellow-100': '#B8D150',
          'graphite-black': '#1A1A1A',
          'graphite-100': '#656565',
          'concrete': '#9FA38F',
          'concrete-100': '#E7E8E3',
          'concrete-200': '#CFD1C7',
          'arctic-white': '#FFFFFF',
        },
      },
    },
  },
  plugins: [],
}
```

---

## 3. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 18 + Vite | TypeScript |
| Styling | Tailwind CSS | Brand config above |
| Map | Mapbox GL JS v3 | `mapbox-gl` npm package |
| State management | Zustand | Lightweight, fits this use case |
| Data fetching | TanStack Query (React Query) | Caching, pagination |
| Backend API | Node.js + Fastify | TypeScript |
| Database | PostgreSQL 15 + PostGIS 3.4 | Spatial queries |
| ORM | Knex.js | Supports raw PostGIS queries |
| Auth | JWT + bcrypt (v1 username/password) | Upgrade path to Auth0 in v2 |
| PDF generation | Puppeteer (server-side) | Renders React component to PDF |
| File storage | Google Cloud Storage (GCS) | PDF exports, GIS layer caches |
| Hosting (API + DB) | Google Cloud Run + Cloud SQL (PostgreSQL) | Serverless containers, managed PG |
| Hosting (Frontend) | Firebase Hosting or Cloud Run | Static assets via CDN |
| Enrichment pipeline | Node.js worker script on Cloud Run Jobs | Scheduled via Cloud Scheduler |
| GIS processing | PostGIS + `turf.js` in enrichment worker | Spatial joins, distance calc |
| Secrets | Google Secret Manager | API keys (Mapbox, etc.) |

### 3.1 GCP Project Structure

```
gcp-project: lumen-fom-screener
  ├── Cloud Run: lumen-screener-api        (backend API)
  ├── Cloud Run Job: lumen-enrichment      (pipeline worker)
  ├── Cloud SQL: lumen-screener-db         (PostgreSQL + PostGIS)
  ├── Cloud Storage: lumen-screener-assets (GIS layers, PDF exports)
  ├── Cloud Scheduler: enrichment-cron     (quarterly trigger)
  ├── Firebase Hosting: screener.lumen.co  (frontend)
  └── Secret Manager: [all API keys]
```

---

## 4. Database Schema

### 4.1 Core Tables

```sql
-- Input site records (from Lumen's existing database)
CREATE TABLE sites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id     TEXT UNIQUE NOT NULL,        -- Lumen's internal site ID
  address         TEXT,
  city            TEXT,
  state           TEXT DEFAULT 'IL',
  zip             TEXT,
  owner_name      TEXT,
  owner_entity    TEXT,                        -- LLC, Corp, Individual, etc.
  lat             NUMERIC(10,7) NOT NULL,
  lng             NUMERIC(10,7) NOT NULL,
  geom            GEOMETRY(Point, 4326),       -- PostGIS point
  lot_polygon     GEOMETRY(Polygon, 4326),     -- PostGIS lot boundary
  building_fp     GEOMETRY(MultiPolygon, 4326),-- PostGIS building footprint
  lot_area_sqft   NUMERIC,
  building_area_sqft NUMERIC,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX sites_geom_idx ON sites USING GIST(geom);
CREATE INDEX sites_lot_idx ON sites USING GIST(lot_polygon);

-- Enriched attributes (written by pipeline, read by scoring)
CREATE TABLE site_enrichments (
  site_id                     UUID PRIMARY KEY REFERENCES sites(id),
  
  -- Grid & Interconnection
  nearest_substation_name     TEXT,
  nearest_substation_id       TEXT,
  nearest_substation_dist_mi  NUMERIC(8,4),
  nearest_substation_kv       NUMERIC,
  hosting_capacity_tier       TEXT CHECK (hosting_capacity_tier IN ('High','Medium','Low','Unknown')),
  hosting_capacity_mw_min     NUMERIC,
  hosting_capacity_mw_max     NUMERIC,
  hosting_capacity_source     TEXT DEFAULT 'ComEd ArcGIS Hosting Capacity Map',
  miso_lrz                    TEXT,
  miso_pnode_id               TEXT,
  miso_pnode_name             TEXT,
  
  -- Physical / Environmental
  fema_flood_zone             TEXT,           -- AE, AO, VE, A, X, X500, etc.
  fema_flood_risk_tier        TEXT CHECK (fema_flood_risk_tier IN ('High','Medium','Low')),
  wetland_within_500ft        BOOLEAN,
  wetland_type                TEXT,
  developable_area_acres      NUMERIC(10,4),  -- lot area minus building footprint
  
  -- Zoning (from Regrid)
  zoning_code                 TEXT,
  zoning_description          TEXT,
  zoning_compatible           TEXT CHECK (zoning_compatible IN ('Yes','Review','No')),
  
  -- Incentive & Policy
  ira_energy_community        BOOLEAN,
  ira_ec_type                 TEXT,           -- 'Coal Closure','Fossil Fuel Employment','Brownfield'
  ceja_ej_community           BOOLEAN,
  ejscreen_score              NUMERIC(5,2),   -- 0-100
  epa_brownfield              BOOLEAN,
  il_enterprise_zone          BOOLEAN,
  
  -- Enrichment metadata
  enriched_at                 TIMESTAMPTZ DEFAULT now(),
  enrichment_version          TEXT DEFAULT '1.0',
  
  -- Per-field data freshness
  grid_enriched_at            TIMESTAMPTZ,
  fema_enriched_at            TIMESTAMPTZ,
  incentive_enriched_at       TIMESTAMPTZ
);

-- Users
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT,
  role          TEXT DEFAULT 'analyst' CHECK (role IN ('analyst','admin')),
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Saved filter presets
CREATE TABLE filter_presets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id),
  name          TEXT NOT NULL,
  filter_state  JSONB NOT NULL,             -- serialized filter + weight config
  is_shared     BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Reference: ComEd substations (loaded from EIA 860 + ArcGIS layer)
CREATE TABLE comed_substations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT,
  voltage_kv    NUMERIC,
  geom          GEOMETRY(Point, 4326),
  source        TEXT
);
CREATE INDEX comed_sub_geom_idx ON comed_substations USING GIST(geom);

-- Reference: GIS layers cached as PostGIS tables (loaded by enrichment pipeline)
-- miso_lrz_zones, energy_community_tracts, nwi_wetlands_il, 
-- fema_nfhl_il, regrid_zoning_il, il_enterprise_zones
-- (each created dynamically by pipeline from downloaded shapefiles)
```

---

## 5. Scoring Model

Scores are computed **at query time in PostgreSQL** using weights passed from the frontend as query parameters. No scores are stored — they are always derived from enrichment attributes + current weights.

### 5.1 Technical Viability Score (0–100)

```sql
-- PostgreSQL scoring function (parameterized)
CREATE OR REPLACE FUNCTION score_technical(
  e site_enrichments,
  w_area NUMERIC DEFAULT 0.25,
  w_substation NUMERIC DEFAULT 0.25,
  w_hosting NUMERIC DEFAULT 0.20,
  w_flood NUMERIC DEFAULT 0.15,
  w_wetland NUMERIC DEFAULT 0.10,
  w_zoning NUMERIC DEFAULT 0.05
) RETURNS NUMERIC AS $$
DECLARE
  s_area NUMERIC;
  s_sub NUMERIC;
  s_hosting NUMERIC;
  s_flood NUMERIC;
  s_wetland NUMERIC;
  s_zoning NUMERIC;
BEGIN
  -- Developable area score
  s_area := CASE
    WHEN e.developable_area_acres >= 5   THEN 100
    WHEN e.developable_area_acres >= 2   THEN 75
    WHEN e.developable_area_acres >= 1   THEN 50
    WHEN e.developable_area_acres >= 0.5 THEN 25
    ELSE 0 END;

  -- Distance to substation score
  s_sub := CASE
    WHEN e.nearest_substation_dist_mi < 0.25  THEN 100
    WHEN e.nearest_substation_dist_mi < 0.5   THEN 80
    WHEN e.nearest_substation_dist_mi < 1.0   THEN 60
    WHEN e.nearest_substation_dist_mi < 2.0   THEN 30
    ELSE 0 END;

  -- Hosting capacity score
  s_hosting := CASE
    WHEN e.hosting_capacity_tier = 'High'    THEN 100
    WHEN e.hosting_capacity_tier = 'Medium'  THEN 60
    WHEN e.hosting_capacity_tier = 'Unknown' THEN 40
    WHEN e.hosting_capacity_tier = 'Low'     THEN 20
    ELSE 40 END;

  -- Flood zone score (also used as hard filter)
  s_flood := CASE
    WHEN e.fema_flood_zone LIKE 'X%'         THEN 100
    WHEN e.fema_flood_zone = 'A'             THEN 50
    WHEN e.fema_flood_zone IN ('AE','AO','VE') THEN 0
    ELSE 50 END;

  -- Wetland score
  s_wetland := CASE
    WHEN e.wetland_within_500ft = false THEN 100
    WHEN e.wetland_within_500ft = true  THEN 25
    ELSE 70 END;  -- NULL = unknown, give partial credit

  -- Zoning score
  s_zoning := CASE
    WHEN e.zoning_compatible = 'Yes'    THEN 100
    WHEN e.zoning_compatible = 'Review' THEN 50
    WHEN e.zoning_compatible = 'No'     THEN 0
    ELSE 50 END;

  RETURN ROUND(
    (s_area * w_area) +
    (s_sub * w_substation) +
    (s_hosting * w_hosting) +
    (s_flood * w_flood) +
    (s_wetland * w_wetland) +
    (s_zoning * w_zoning),
    1
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### 5.2 Commercial Viability Score (0–100)

```sql
CREATE OR REPLACE FUNCTION score_commercial(
  e site_enrichments,
  w_ira NUMERIC DEFAULT 0.30,
  w_miso NUMERIC DEFAULT 0.20,
  w_ceja NUMERIC DEFAULT 0.20,
  w_brownfield NUMERIC DEFAULT 0.15,
  w_zoning NUMERIC DEFAULT 0.10,
  w_enterprise NUMERIC DEFAULT 0.05
) RETURNS NUMERIC AS $$
DECLARE
  s_ira NUMERIC;
  s_miso NUMERIC;
  s_ceja NUMERIC;
  s_brownfield NUMERIC;
  s_zoning NUMERIC;
  s_enterprise NUMERIC;
BEGIN
  s_ira        := CASE WHEN e.ira_energy_community = true THEN 100 ELSE 0 END;
  -- MISO LRZ scoring: LRZ 4 (ComEd) scores highest within IL
  -- All ComEd sites should be LRZ 4; score = 80 as baseline, 100 if confirmed
  s_miso       := CASE WHEN e.miso_lrz = '4' THEN 80 ELSE 40 END;
  s_ceja       := CASE WHEN e.ceja_ej_community = true THEN 100 ELSE 0 END;
  s_brownfield := CASE WHEN e.epa_brownfield = true THEN 100 ELSE 0 END;
  s_zoning     := CASE
    WHEN e.zoning_compatible = 'Yes'    THEN 100
    WHEN e.zoning_compatible = 'Review' THEN 50
    WHEN e.zoning_compatible = 'No'     THEN 0
    ELSE 50 END;
  s_enterprise := CASE WHEN e.il_enterprise_zone = true THEN 100 ELSE 0 END;

  RETURN ROUND(
    (s_ira * w_ira) +
    (s_miso * w_miso) +
    (s_ceja * w_ceja) +
    (s_brownfield * w_brownfield) +
    (s_zoning * w_zoning) +
    (s_enterprise * w_enterprise),
    1
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### 5.3 Composite Score

```
composite_score = (tech_weight × technical_score) + (comm_weight × commercial_score)
where tech_weight + comm_weight = 1.0
Default: tech_weight = 0.5, comm_weight = 0.5
```

### 5.4 Hard Filters

Applied as SQL WHERE clauses before scoring. Each filter is a boolean toggle in the UI.

| Filter ID | SQL Condition | Default |
|---|---|---|
| `exclude_high_flood` | `fema_flood_risk_tier != 'High'` | ON |
| `min_developable_area` | `developable_area_acres >= 0.5` | ON |
| `exclude_zoning_no` | `zoning_compatible != 'No'` | OFF |
| `require_hosting_data` | `hosting_capacity_tier != 'Unknown'` | OFF |
| `require_ira_adder` | `ira_energy_community = true` | OFF |
| `require_ej_community` | `ceja_ej_community = true` | OFF |
| `require_brownfield` | `epa_brownfield = true` | OFF |

---

## 6. API Specification

### 6.1 Authentication

```
POST /api/auth/login
Body: { email: string, password: string }
Response: { token: string, user: { id, name, email, role } }

POST /api/auth/logout
POST /api/auth/refresh
GET  /api/auth/me
```

All other endpoints require `Authorization: Bearer <token>` header.

### 6.2 Sites

```
GET /api/sites
Query params:
  page: number (default 1)
  limit: number (default 50, max 200)
  sort_by: string (composite_score | technical_score | commercial_score | developable_area_acres | nearest_substation_dist_mi)
  sort_dir: asc | desc (default desc)
  tech_weight: 0.0–1.0 (default 0.5)
  
  -- Weight params for technical score (must sum to 1.0)
  w_area: number
  w_substation: number
  w_hosting: number
  w_flood: number
  w_wetland: number
  w_zoning_tech: number
  
  -- Weight params for commercial score (must sum to 1.0)
  w_ira: number
  w_miso: number
  w_ceja: number
  w_brownfield: number
  w_zoning_comm: number
  w_enterprise: number
  
  -- Hard filters (boolean)
  exclude_high_flood: boolean
  min_developable_area: boolean
  exclude_zoning_no: boolean
  require_hosting_data: boolean
  require_ira_adder: boolean
  require_ej_community: boolean
  require_brownfield: boolean
  
  -- Spatial filter
  bbox: "minLng,minLat,maxLng,maxLat"    -- map viewport
  polygon: GeoJSON string                 -- drawn polygon
  county: string                          -- county name filter

Response: {
  sites: [SiteRow],
  total: number,           -- total matching hard filters
  filtered: number,        -- total in DB
  page: number,
  pages: number,
  score_stats: {
    composite_mean: number,
    composite_p75: number,
    technical_mean: number,
    commercial_mean: number
  }
}

SiteRow: {
  id, external_id, address, city, zip,
  owner_name, owner_entity, lat, lng,
  composite_score, technical_score, commercial_score,
  -- key display attributes
  developable_area_acres, nearest_substation_dist_mi,
  hosting_capacity_tier, fema_flood_zone, fema_flood_risk_tier,
  ira_energy_community, ceja_ej_community, epa_brownfield,
  zoning_compatible, miso_lrz, enriched_at
}

GET /api/sites/:id
Response: SiteDetail (all fields from sites + all site_enrichments fields + score breakdown)

SiteDetail includes:
  score_breakdown: {
    technical: { total, components: { area, substation, hosting, flood, wetland, zoning } }
    commercial: { total, components: { ira, miso, ceja, brownfield, zoning, enterprise } }
    composite: number
  }

GET /api/sites/export/csv
Query: same filter params as GET /api/sites (no pagination — returns all)
Response: CSV stream with Content-Disposition: attachment

POST /api/sites/:id/report
Response: { report_url: string }  -- signed GCS URL to PDF
```

### 6.3 Map Layers

```
GET /api/layers/hosting-capacity     -- ComEd feeder GeoJSON (simplified)
GET /api/layers/fema-flood           -- FEMA NFHL polygons for IL (tiled or simplified)
GET /api/layers/miso-lrz            -- MISO LRZ boundaries
GET /api/layers/energy-community     -- DOE Energy Community Census tracts
GET /api/layers/ejscreen             -- EJScreen block groups (IL)
GET /api/layers/substations          -- ComEd substation points

All layer endpoints return GeoJSON FeatureCollection
Response cached in-memory for 1 hour; source data from GCS
```

### 6.4 Filter Presets

```
GET  /api/presets                    -- user's presets + shared presets
POST /api/presets                    -- save new preset
  Body: { name: string, filter_state: object, is_shared: boolean }
PUT  /api/presets/:id
DELETE /api/presets/:id
```

### 6.5 Admin / Pipeline

```
POST /api/admin/enrich/run           -- trigger full enrichment run (admin only)
POST /api/admin/enrich/site/:id      -- re-enrich single site
GET  /api/admin/enrich/status        -- pipeline status + last run metadata
GET  /api/admin/enrich/stats         -- % of sites enriched, field coverage rates
```

---

## 7. Enrichment Pipeline

### 7.1 Data Sources & Processing

| Dataset | Source URL / Method | Processing | Refresh |
|---|---|---|---|
| ComEd Hosting Capacity | ArcGIS REST API: `https://exelonutilities.maps.arcgis.com/apps/webappviewer/index.html?id=c4068de162b943c9bd81fe4c4fbfe0ea` — use the underlying ArcGIS Feature Service REST endpoint (find via browser network inspector on the map app) | Download as GeoJSON → PostGIS table → spatial join to site geom | Quarterly |
| FEMA NFHL | REST API: `https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer` — query IL flood zone polygons | Download IL NFHL → PostGIS → spatial join | Annual |
| MISO LRZ | Download shapefile from MISO.org > Resource Adequacy | PostGIS table → spatial join | Annual |
| MISO Pnodes | CSV from MISO MISO's pnode file | Nearest-neighbor spatial query | Annual |
| DOE Energy Community | Shapefile from energycommunities.gov | PostGIS table → spatial join | Per IRS update |
| EPA EJScreen | REST API: `https://ejscreen.epa.gov/mapper/ejscreenRESTbroker.aspx` or bulk IL download | PostGIS table → spatial join | Annual |
| EPA Brownfields | REST API or IL shapefile from ACRES: `https://www.epa.gov/brownfields` | PostGIS table → spatial join | Biannual |
| NWI Wetlands (IL) | Download from USFWS NWI: `https://www.fws.gov/program/national-wetlands-inventory` | PostGIS table → 500ft buffer intersect | Annual |
| Regrid Zoning (IL) | Licensed data (user has access) | Import to PostGIS → spatial join → zoning_compatible rule lookup | Annual |
| IL Enterprise Zones | Shapefile from DCEO | PostGIS table → spatial join | Annual |
| ComEd Substations | EIA Form 860 (utility-level substation data) as proxy; supplement with ComEd ArcGIS service if available | PostGIS table → nearest-neighbor via `ST_Distance` | Annual |

### 7.2 Zoning Compatibility Rule Table

```js
// zoning_compat_rules.js
const COMPATIBLE = ['I-1','I-2','I-3','M-1','M-2','M-3','C-3','C-4','B-3','PD-I','AG'];
const REVIEW =     ['C-1','C-2','B-1','B-2','PD','MXD','PUD'];
const INCOMPATIBLE = ['R-1','R-2','R-3','R-4','R-5','OS','P','CON'];

export function resolveZoningCompat(zoningCode) {
  const code = zoningCode?.toUpperCase().trim();
  if (!code) return 'Review';
  if (COMPATIBLE.some(c => code.startsWith(c))) return 'Yes';
  if (INCOMPATIBLE.some(c => code.startsWith(c))) return 'No';
  return 'Review';
}
```

### 7.3 Pipeline Worker Flow

```
[Cloud Run Job: lumen-enrichment]

1. LOAD_GIS_LAYERS (run if layers stale or forced)
   - Download each GIS dataset listed above
   - Store as PostGIS tables: miso_lrz, energy_community, ejscreen_bg, 
     nwi_wetlands, fema_nfhl, regrid_zoning, il_enterprise_zones,
     comed_substations, comed_hosting_capacity
   - Log layer load timestamps

2. ENRICH_SITES (batch of 100 sites per iteration)
   For each site where enriched_at IS NULL or enriched_at < refresh_threshold:
   
   a. Substation nearest-neighbor:
      SELECT s.name, s.voltage_kv, ST_Distance(site.geom::geography, s.geom::geography)/1609.34 AS dist_mi
      FROM comed_substations s
      ORDER BY site.geom <-> s.geom LIMIT 1;
   
   b. Hosting capacity tier:
      SELECT tier FROM comed_hosting_capacity h
      WHERE ST_Within(site.geom, h.geom) LIMIT 1;
   
   c. MISO LRZ:
      SELECT lrz FROM miso_lrz WHERE ST_Within(site.geom, geom);
   
   d. FEMA flood zone:
      SELECT fld_zone, fld_zone_subtype FROM fema_nfhl 
      WHERE ST_Within(site.geom, geom) ORDER BY risk_level DESC LIMIT 1;
      → Derive flood_risk_tier from zone code
   
   e. Wetland within 500ft:
      SELECT EXISTS(
        SELECT 1 FROM nwi_wetlands 
        WHERE ST_DWithin(site.geom::geography, geom::geography, 152.4)  -- 500ft in meters
      );
   
   f. Zoning:
      SELECT zone_code, zone_desc FROM regrid_zoning
      WHERE ST_Within(site.geom, geom) LIMIT 1;
      → Apply resolveZoningCompat()
   
   g. IRA Energy Community:
      SELECT ec_type FROM energy_community WHERE ST_Within(site.geom, geom) LIMIT 1;
   
   h. EJScreen:
      SELECT p_ej_score FROM ejscreen_bg WHERE ST_Within(site.geom, geom) LIMIT 1;
      → ceja_ej_community = (p_ej_score >= 80 AND income qualifies — use IL median)
   
   i. EPA Brownfield:
      SELECT EXISTS(SELECT 1 FROM epa_brownfields WHERE ST_DWithin(site.geom::geography, geom::geography, 50));
   
   j. Enterprise Zone:
      SELECT EXISTS(SELECT 1 FROM il_enterprise_zones WHERE ST_Within(site.geom, geom));
   
   k. Developable area:
      SELECT (ST_Area(lot_polygon::geography) - ST_Area(building_fp::geography)) / 4046.86 AS acres
      FROM sites WHERE id = site_id;
   
   l. Write all to site_enrichments table with enriched_at = now()

3. LOG_RUN
   INSERT INTO enrichment_runs (started_at, completed_at, sites_processed, errors)
```

---

## 8. Frontend Specification

### 8.1 Application Routes

```
/login              -- Login page
/                   -- Redirects to /screener
/screener           -- Main screening tool (map + table)
/screener/:siteId   -- Site detail view (right panel opens)
/presets            -- Manage saved filter presets
/admin/pipeline     -- Admin: enrichment pipeline dashboard
```

### 8.2 Page Layout: /screener

```
┌─────────────────────────────────────────────────────────────┐
│ NAV: [Lumen Logo]  FOM Screener     [Presets] [Export] [User]│ ← Graphite Black bg
├──────────────────┬──────────────────────────────────────────┤
│  FILTER PANEL    │           MAP (Mapbox GL JS)             │
│  (320px fixed)   │           60% width                      │
│                  │                                          │
│  Hard Filters    │  [Layer toggles]                         │
│  ─────────────   │                                          │
│  □ Excl. Flood   │  [site markers: score-colored circles]   │
│  □ Min 0.5ac     │                                          │
│  □ Excl. Zoning  │  [Draw polygon tool]                     │
│  □ IRA Adder     │  [County selector]                       │
│                  │                                          │
│  Site count:     ├──────────────────────────────────────────┤
│  [842 / 3,412]   │  RANKED TABLE (40% width)                │
│                  │  [Sort] [Columns] [Export CSV]           │
│  Score Weights   │                                          │
│  ─────────────   │  # │ Address │ Tech │ Comm │ Comp │ ...  │
│  Tech ◄──►Comm   │  1 │ ...     │ 82   │ 71   │ 76   │ ...  │
│  [slider]        │  2 │ ...     │ 79   │ 65   │ 72   │ ...  │
│                  │  ...                                     │
│  Technical Wts   │                                          │
│  Area      [25%] │  [Pagination]                            │
│  Substation[25%] │                                          │
│  Hosting   [20%] │                                          │
│  Flood     [15%] │                                          │
│  Wetland   [10%] │                                          │
│  Zoning    [ 5%] │                                          │
│                  │                                          │
│  Commercial Wts  │                                          │
│  IRA Adder [30%] │                                          │
│  MISO LRZ  [20%] │                                          │
│  CEJA/EJ   [20%] │                                          │
│  Brownfield[15%] │                                          │
│  Zoning    [10%] │                                          │
│  Enterprise[ 5%] │                                          │
│                  │                                          │
│  [Save Preset]   │                                          │
│  [Share Preset]  │                                          │
└──────────────────┴──────────────────────────────────────────┘
```

### 8.3 Map Configuration (Mapbox GL JS)

```js
// Map initialization
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/light-v11',   // Clean light base for data overlay
  center: [-88.5, 41.8],                        // ComEd IL centroid
  zoom: 8,
  bounds: [[-91.5, 36.9], [-85.5, 42.5]]       // IL bounding box
});

// Site markers: circle layer colored by composite score
map.addLayer({
  id: 'sites',
  type: 'circle',
  source: 'sites-geojson',
  paint: {
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 4, 12, 8],
    'circle-color': [
      'interpolate', ['linear'], ['get', 'composite_score'],
      0,   '#9FA38F',   // Concrete — low score
      25,  '#77AFD7',   // Sky Blue 400 — below average  
      50,  '#B1E5FF',   // Sky Blue — average
      75,  '#DFFF5E',   // Electric Yellow — high score
      90,  '#B8D150'    // Electric Yellow 100 — top sites
    ],
    'circle-stroke-color': '#1A1A1A',
    'circle-stroke-width': 0.5,
    'circle-opacity': 0.85
  }
});

// Toggleable overlay layers:
// 1. ComEd hosting capacity (choropleth by tier)
// 2. FEMA flood zones (red fill for AE/AO/VE, transparent for X)
// 3. MISO LRZ boundaries (outline only)
// 4. DOE Energy Community tracts (yellow-tint fill)
// 5. EJScreen block groups (blue-scale choropleth)
// 6. ComEd substation points (star markers)
```

### 8.4 Site Detail Panel

Opens as a right-side drawer (400px) when a site marker or table row is clicked. Does not replace the map.

```
┌─────────────────────────────────────────┐
│ [←] 1400 Enterprise Dr, Joliet IL      │
│      Owner: Acme Logistics LLC          │
│      Lot: 8.4 acres  |  Building: 3.1ac│
├─────────────────────────────────────────┤
│  COMPOSITE SCORE: 78 / 100             │ ← Electric Yellow badge if ≥75
│  ████████████████░░░░ Technical: 82    │ ← Sky Blue bar
│  ███████████████░░░░░ Commercial: 73   │ ← Sky Blue-400 bar
├─────────────────────────────────────────┤
│  TECHNICAL BREAKDOWN                   │
│  Developable Area    5.3ac    ●●●●● 100│
│  Substation Distance 0.3mi   ●●●●○  80 │
│  Hosting Capacity    Medium  ●●●○○  60 │
│  Flood Zone          X       ●●●●● 100 │
│  Wetland Proximity   None    ●●●●● 100 │
│  Zoning              I-2     ●●●●● 100 │
├─────────────────────────────────────────┤
│  COMMERCIAL BREAKDOWN                  │
│  IRA Energy Community  ✓ Coal Closure  │ ← Electric Yellow badge
│  MISO LRZ              LRZ 4          │
│  CEJA/EJ Community     ✓              │ ← Sky Blue badge
│  EPA Brownfield        ✗              │
│  Enterprise Zone       ✗              │
├─────────────────────────────────────────┤
│  SITE DATA                             │
│  Nearest Substation: Joliet North 138kV│
│  Distance: 0.3 mi                      │
│  MISO Pnode: JOLIET.NORTH             │
│  Hosting Capacity: Medium (3–6 MW)     │
│  Flood Zone: X (Minimal Risk)          │
│  Zoning: I-2 Industrial               │
│  Enriched: Feb 12, 2025               │
├─────────────────────────────────────────┤
│  [Export PDF]  [ComEd Map ↗] [FEMA ↗] │
└─────────────────────────────────────────┘
```

### 8.5 Results Table Columns

Default visible columns (user can show/hide):

| Column | Type | Sortable |
|---|---|---|
| Rank # | number | — |
| Address | text | — |
| Composite Score | number (badge colored) | ✓ |
| Technical Score | number | ✓ |
| Commercial Score | number | ✓ |
| Developable Area (ac) | number | ✓ |
| Substation Distance (mi) | number | ✓ |
| Hosting Capacity | badge (High/Med/Low) | ✓ |
| Flood Zone | text | ✓ |
| IRA Adder | boolean badge | ✓ |
| EJ Community | boolean badge | — |
| Brownfield | boolean badge | — |
| Owner | text | — |

### 8.6 PDF Report Card Spec

Generated server-side via Puppeteer. Renders a React component (`/report/:siteId`) to PDF.

One page, A4/Letter. Sections:
1. **Header:** Lumen logo (left), report date (right), site address as title
2. **Score summary:** Two large score dials (Technical / Commercial) + Composite
3. **Technical breakdown:** Horizontal bar chart for each criterion
4. **Commercial breakdown:** Icon + label for each flag (green check / grey X)
5. **Site attributes table:** Key-value pairs for all enrichment data
6. **Map thumbnail:** Static Mapbox Static API image centered on site with 0.5mi radius
7. **Footer:** "Lumen Energy — FOM Battery Site Screener" + page number + "Data as of [enriched_at]"

Colors follow Lumen brand: Sky Blue bars, Electric Yellow for high scores, Graphite text, white background.

---

## 9. Build Phases & Task Breakdown

### Phase 1 — Core MVP

**Goal:** End-to-end working tool with 5 key data attributes, map, table, scoring, and CSV export.

**Enrichment attributes in Phase 1:**
- Developable area (derived from lot polygon + building footprint — no external data needed)
- FEMA flood zone (FEMA NFHL REST API)
- Distance to nearest substation (EIA Form 860 + PostGIS nearest-neighbor)
- IRA Energy Community adder (DOE shapefile)
- MISO LRZ (MISO shapefile)

**Task list:**
1. GCP project setup: Cloud SQL (PostGIS), Cloud Run, Cloud Storage, Secret Manager
2. Database schema creation (sites, site_enrichments, users, filter_presets tables)
3. Site data importer (CSV/GeoJSON → PostgreSQL)
4. Phase 1 enrichment pipeline (5 attributes above)
5. Scoring SQL functions (technical + commercial, parameterized weights)
6. Fastify API: auth endpoints, GET /api/sites with filters + scoring, GET /api/sites/:id
7. React app scaffold: Vite + Tailwind + Lumen brand config
8. Login page (Lumen branded)
9. Map component: Mapbox GL JS, site markers colored by score
10. Filter panel: hard filter toggles (Phase 1 subset), tech/comm weight slider
11. Results table: sortable, paginated, row → map sync
12. Site detail panel (right drawer)
13. CSV export endpoint + frontend button
14. Deploy: Cloud Run API + Firebase Hosting frontend

**Phase 1 deliverable:** Functional tool with ~5 enrichment fields and basic scoring. Usable for early analyst feedback.

---

### Phase 2 — Full Enrichment + Map Layers

**Goal:** All 11 enrichment attributes live, all scoring criteria active, all map overlay layers, full site detail panel.

**Additional enrichment attributes:**
- ComEd hosting capacity tier (from ArcGIS map Feature Service)
- NWI wetland proximity (USFWS NWI download)
- Zoning compatibility (Regrid data import)
- EPA brownfield flag (EPA ACRES)
- CEJA/EJ community flag (EJScreen API)
- Illinois enterprise zone (DCEO shapefile)
- ComEd substation name/voltage (supplement EIA 860)

**Additional tasks:**
1. Enrich pipeline extensions for all 6 remaining attributes
2. Ingest Regrid zoning data + apply compatibility rule table
3. Load ComEd hosting capacity ArcGIS Feature Service (find REST endpoint from the viewer URL)
4. All 7 hard filter toggles active
5. All scoring weight sliders active (technical 6 criteria, commercial 6 criteria)
6. Map layer toggles: hosting capacity, FEMA, MISO LRZ, energy community, EJScreen, substations
7. County/township selector for spatial filtering
8. Draw polygon tool on map (Mapbox Draw plugin)
9. Full site detail panel with complete breakdown
10. Score statistics bar in filter panel ("842 sites / mean composite: 61")
11. Filter impact preview ("Turning this on removes 340 sites")
12. PDF report card (Puppeteer, GCS storage, signed URL delivery)

---

### Phase 3 — Collaboration & Admin

**Goal:** Team workflow features, admin pipeline management, shareable presets.

**Tasks:**
1. Saved filter presets (per-user + shareable)
2. Shareable URL: encode filter state as base64 URL param, decode on load
3. Admin dashboard: enrichment pipeline status, last run, field coverage stats, manual trigger
4. Enrichment scheduler: Cloud Scheduler → Cloud Run Job (quarterly cron)
5. User management page (admin only): invite user, reset password, set role
6. Column show/hide configurator in results table
7. Bulk export with column selection
8. Enrichment freshness indicators in site detail panel ("Flood zone data: 8 months old")
9. Site notes / bookmarking (analyst can flag a site for follow-up)
10. Email notification when enrichment run completes (Cloud Run + SendGrid or GCP Gmail API)

---

## 10. Environment Variables & Secrets

```bash
# API
DATABASE_URL=postgresql://...@/lumen_screener?host=/cloudsql/...
MAPBOX_TOKEN=pk.eyJ1...           # Server-side static map API calls
JWT_SECRET=...
GCS_BUCKET=lumen-screener-assets
GCP_PROJECT_ID=lumen-fom-screener

# Frontend (Vite env vars)
VITE_MAPBOX_TOKEN=pk.eyJ1...      # Client-side Mapbox GL JS
VITE_API_BASE_URL=https://api.screener.lumen.co

# Enrichment pipeline
FEMA_API_BASE=https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer
COMED_ARCGIS_BASE=https://exelonutilities.maps.arcgis.com/...  # discover REST endpoint
EJScreen_API=https://ejscreen.epa.gov/mapper/ejscreenRESTbroker.aspx
```

All secrets stored in GCP Secret Manager. Cloud Run services access via service account with `roles/secretmanager.secretAccessor`.

---

## 11. Folder Structure

```
lumen-fom-screener/
├── api/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── sites.ts
│   │   │   ├── layers.ts
│   │   │   ├── presets.ts
│   │   │   └── admin.ts
│   │   ├── db/
│   │   │   ├── schema.sql
│   │   │   ├── scoring.sql       # PostgreSQL scoring functions
│   │   │   └── knex.ts
│   │   ├── services/
│   │   │   ├── scoring.ts        # weight validation, query builder
│   │   │   ├── export.ts         # CSV streaming
│   │   │   ├── pdf.ts            # Puppeteer PDF generation
│   │   │   └── layers.ts         # GeoJSON layer cache
│   │   └── index.ts
│   ├── Dockerfile
│   └── package.json
│
├── pipeline/
│   ├── src/
│   │   ├── loaders/
│   │   │   ├── fema.ts
│   │   │   ├── miso.ts
│   │   │   ├── energy-community.ts
│   │   │   ├── ejscreen.ts
│   │   │   ├── brownfields.ts
│   │   │   ├── nwi-wetlands.ts
│   │   │   ├── regrid-zoning.ts
│   │   │   ├── enterprise-zones.ts
│   │   │   ├── comed-hosting.ts
│   │   │   └── substations.ts
│   │   ├── enricher.ts            # Main batch enrichment logic
│   │   ├── zoning-rules.ts
│   │   └── index.ts
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── map/
│   │   │   │   ├── ScreenerMap.tsx
│   │   │   │   ├── SiteMarkers.tsx
│   │   │   │   ├── LayerToggles.tsx
│   │   │   │   └── DrawTool.tsx
│   │   │   ├── filters/
│   │   │   │   ├── FilterPanel.tsx
│   │   │   │   ├── HardFilters.tsx
│   │   │   │   ├── WeightSliders.tsx
│   │   │   │   └── TechCommBalance.tsx
│   │   │   ├── table/
│   │   │   │   ├── SiteTable.tsx
│   │   │   │   ├── ScoreBadge.tsx
│   │   │   │   └── ColumnSelector.tsx
│   │   │   ├── detail/
│   │   │   │   ├── SiteDetailPanel.tsx
│   │   │   │   ├── ScoreBreakdown.tsx
│   │   │   │   └── AttributeTable.tsx
│   │   │   └── shared/
│   │   │       ├── LumenNav.tsx
│   │   │       ├── Button.tsx
│   │   │       └── Badge.tsx
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Screener.tsx
│   │   │   ├── Presets.tsx
│   │   │   └── Admin.tsx
│   │   ├── store/
│   │   │   ├── filterStore.ts     # Zustand: filter + weight state
│   │   │   └── uiStore.ts         # Zustand: selected site, panel state
│   │   ├── hooks/
│   │   │   ├── useSites.ts        # TanStack Query: GET /api/sites
│   │   │   └── useSiteDetail.ts
│   │   └── lib/
│   │       ├── api.ts             # Axios client + auth interceptor
│   │       └── mapbox.ts          # Map initialization helpers
│   ├── tailwind.config.js         # Lumen brand tokens
│   ├── index.html
│   └── package.json
│
├── infra/
│   ├── cloudbuild.yaml            # CI/CD
│   ├── cloud-run-api.yaml
│   ├── cloud-run-pipeline.yaml
│   └── cloud-scheduler.yaml
│
└── README.md
```

---

## 12. Open Items for Kickoff

1. **ComEd ArcGIS Feature Service REST URL** — The viewer URL provided (`exelonutilities.maps.arcgis.com/apps/webappviewer/?id=c4068de162b943c9bd81fe4c4fbfe0ea`) wraps underlying ArcGIS Feature Services. Before starting Phase 2, inspect the viewer's network requests to identify the actual REST endpoint (format: `.../FeatureServer/0/query`). This is the URL the enrichment pipeline will query. Claude Code will need this URL as an env var.

2. **Mapbox Account** — Provide a Mapbox public token (`pk.eyJ1...`) before frontend build starts. The static maps API (for PDF thumbnails) requires a separate server-side token scope.

3. **Site data import format** — Confirm the exact schema/format of the Lumen site database export (CSV, GeoJSON, or database dump) before Phase 1 begins. The importer will be built to match.

4. **Regrid delivery format** — Confirm how Regrid zoning data is delivered (API, shapefile, GeoJSON) and at what geographic extent (full IL or ComEd counties only).

5. **Domain / hosting URL** — What domain should the tool be deployed to? (e.g., `screener.lumen.co`, `fom.lumen.energy`). Needed for Firebase Hosting and CORS config.
```
