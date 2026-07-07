// Mirrors Green Man Gaming's per-currency Impact catalogs into
// <output-dir>/gmg-discounts-<CURRENCY>.json, keeping only discounted items.
//
// Env: IMPACT_ACCOUNT_SID, IMPACT_AUTH_TOKEN (required),
//      IMPACT_CATALOG_ID (optional, mirror only this catalog)
// Usage: node .github/scripts/mirror-gmg-feed.mjs <output-dir>

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const API_BASE = process.env.IMPACT_API_BASE ?? 'https://api.impact.com'
const PAGE_SIZE = 1000
const MAX_PAGES = 20

// Never add `Uri` here: it embeds the partner Account SID in its path.
const KEPT_FIELDS = [
  'CatalogItemId',
  'Id',
  'Name',
  'Url',
  'ImageUrl',
  'CurrentPrice',
  'OriginalPrice',
  'Currency',
  'Manufacturer',
  'StockAvailability',
  'Text1'
]

const requireEnv = (name) => {
  const value = process.env[name]
  if (!value) {
    console.error(`Missing required env var ${name}`)
    process.exit(1)
  }
  return value
}

const outDir = process.argv[2]
if (!outDir) {
  console.error('Usage: node mirror-gmg-feed.mjs <output-dir>')
  process.exit(1)
}
mkdirSync(outDir, { recursive: true })

const accountSid = requireEnv('IMPACT_ACCOUNT_SID')
const authToken = requireEnv('IMPACT_AUTH_TOKEN')

const headers = {
  Authorization:
    'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
  Accept: 'application/json',
  'IR-Version': '16'
}

const get = async (path) => {
  const res = await fetch(`${API_BASE}${path}`, { headers })
  if (!res.ok) {
    throw new Error(`GET ${path} failed: ${res.status} ${res.statusText}`)
  }
  return res.json()
}

// Per currency, keep the catalog with the most items (GMG also publishes
// tiny curated catalogs in the same currencies).
const findCatalogs = async () => {
  const data = await get(`/Mediapartners/${accountSid}/Catalogs`)
  const catalogs = (data.Catalogs ?? []).filter((c) =>
    /green\s*man\s*gaming/i.test(`${c.CampaignName ?? ''} ${c.Name ?? ''}`)
  )

  const fromEnv = process.env.IMPACT_CATALOG_ID
  if (fromEnv) {
    const match = catalogs.find((c) => c.Id === fromEnv)
    if (!match) {
      console.error(`Catalog ${fromEnv} not found among GMG catalogs`)
      process.exit(1)
    }
    return [match]
  }

  const byCurrency = new Map()
  for (const c of catalogs) {
    const currency = (c.Currency ?? '').toUpperCase()
    if (!currency) continue
    const best = byCurrency.get(currency)
    if (!best || Number(c.NumberOfItems) > Number(best.NumberOfItems)) {
      byCurrency.set(currency, c)
    }
  }

  if (byCurrency.size === 0) {
    console.error(
      'Could not auto-discover GMG catalogs. Catalogs visible to this account:'
    )
    for (const c of data.Catalogs ?? []) {
      console.error(
        `  Id=${c.Id} CampaignName=${c.CampaignName} Currency=${c.Currency}`
      )
    }
    process.exit(1)
  }
  return [...byCurrency.values()]
}

const fetchAllItems = async (catalogId) => {
  const items = []
  let page = 1
  let numPages = 1
  do {
    const data = await get(
      `/Mediapartners/${accountSid}/Catalogs/${catalogId}/Items?PageSize=${PAGE_SIZE}&Page=${page}`
    )
    items.push(...(data.Items ?? []))
    numPages = Math.min(parseInt(data['@numpages'] ?? '1', 10) || 1, MAX_PAGES)
    console.log(
      `Fetched page ${page}/${numPages} (${items.length} items so far)`
    )
    page++
  } while (page <= numPages)
  return items
}

const catalogs = await findCatalogs()
console.log(
  `Mirroring ${catalogs.length} GMG catalog(s): ` +
    catalogs.map((c) => `${c.Currency}=${c.Id}`).join(', ')
)

for (const catalog of catalogs) {
  const currency = (catalog.Currency ?? '').toUpperCase()
  const items = await fetchAllItems(catalog.Id)

  const discounted = items
    .filter((item) => {
      const current = parseFloat(item.CurrentPrice ?? '')
      const original = parseFloat(item.OriginalPrice ?? '')
      return (
        Number.isFinite(current) &&
        Number.isFinite(original) &&
        current >= 0 &&
        original > current
      )
    })
    .map((item) =>
      Object.fromEntries(
        KEPT_FIELDS.filter((f) => item[f] !== undefined).map((f) => [
          f,
          item[f]
        ])
      )
    )

  // Zero discounted items means the feed or the parsing broke; fail instead
  // of overwriting the last good mirror.
  if (discounted.length === 0) {
    console.error(
      `Refusing to publish ${currency}: 0 discounted items of ${items.length}`
    )
    process.exit(1)
  }

  const outFile = join(outDir, `gmg-discounts-${currency}.json`)
  writeFileSync(
    outFile,
    JSON.stringify({ '@page': '1', '@numpages': '1', Items: discounted })
  )
  console.log(
    `Wrote ${discounted.length} discounted items (of ${items.length}) to ${outFile}`
  )
}
