import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MenuItem, Select } from '@mui/material'

import { UpdateComponent } from 'frontend/components/UI'
import type {
  CatalogFeature,
  CatalogGenre,
  CatalogProduct
} from 'common/types/discounts'
import DiscountCard from './components/DiscountCard'
import DiscountFilters from './components/DiscountFilters'
import DiscountPagination from './components/DiscountPagination'
import {
  DEFAULT_PAGE_SIZE,
  getLocaleSettings,
  getPegiAge,
  getStoredRegionOverride,
  normalizeRating,
  parseDiscountPercent,
  parsePriceAmount,
  RATING_SCALE_MAX,
  REGION_OPTIONS,
  setStoredRegionOverride,
  type DiscountSort,
  type OsOption,
  type PegiAge
} from './helpers'
import './index.css'

export default function Discounts() {
  const { t, i18n } = useTranslation()
  const [regionOverride, setRegionOverride] = useState<string | null>(() =>
    getStoredRegionOverride()
  )
  const localeSettings = useMemo(
    () => getLocaleSettings(i18n.language, regionOverride),
    [i18n.language, regionOverride]
  )

  const handleRegionChange = (countryCode: string | null) => {
    setRegionOverride(countryCode)
    setStoredRegionOverride(countryCode)
    setSortBy('trending')
    setSelectedGenres([])
    setSelectedFeatures([])
    setSelectedOS([])
    setRatingRange([0, RATING_SCALE_MAX])
    setMaxPegiAge(null)
    setSearchQuery('')
    setHideDlcs(false)
  }

  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [sortBy, setSortBy] = useState<DiscountSort>('trending')
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])
  const [selectedOS, setSelectedOS] = useState<OsOption[]>([])
  const [priceRange, setPriceRange] = useState<[number, number] | null>(null)
  const [ratingRange, setRatingRange] = useState<[number, number]>([
    0,
    RATING_SCALE_MAX
  ])
  const [releaseYearRange, setReleaseYearRange] = useState<
    [number, number] | null
  >(null)
  const [maxPegiAge, setMaxPegiAge] = useState<PegiAge | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [hideDlcs, setHideDlcs] = useState(false)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const [page, setPage] = useState(1)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      setProducts([])

      try {
        const result = await window.api.getGogDiscounts(localeSettings)
        if (!cancelled) {
          setProducts(result)
          setPriceRange(null)
          setReleaseYearRange(null)
        }
      } catch (err) {
        if (!cancelled) {
          window.api.logError(String(err))
          setError(
            t(
              'discounts.error',
              'Could not load discounts. Please try again later.'
            )
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [localeSettings, t])

  const priceMax = useMemo(() => {
    const max = products.reduce((acc, p) => {
      const amount = parsePriceAmount(p.price.finalMoney?.amount)
      return amount > acc ? amount : acc
    }, 0)
    return Math.max(1, Math.ceil(max))
  }, [products])

  const releaseYearBounds = useMemo<[number, number]>(() => {
    const currentYear = new Date().getFullYear()
    let min = currentYear
    let max = currentYear
    let found = false
    for (const p of products) {
      if (!p.releaseDate) continue
      const y = new Date(p.releaseDate).getFullYear()
      if (!Number.isFinite(y)) continue
      if (!found) {
        min = y
        max = y
        found = true
      } else {
        if (y < min) min = y
        if (y > max) max = y
      }
    }
    return [min, max]
  }, [products])

  // GOG sometimes returns multiple slugs for the same display name (e.g.
  // "Multi-player"). Dedup by normalized name so the picker shows each label
  // once, and treat that normalized name as the canonical key used for
  // filtering.
  const genreOptions = useMemo<CatalogGenre[]>(() => {
    const seen = new Map<string, CatalogGenre>()
    for (const p of products) {
      for (const g of p.genres ?? []) {
        const key = g.name.trim().toLowerCase()
        if (!key || seen.has(key)) continue
        seen.set(key, { name: g.name, slug: key })
      }
    }
    return Array.from(seen.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    )
  }, [products])

  const featureOptions = useMemo<CatalogFeature[]>(() => {
    const seen = new Map<string, CatalogFeature>()
    for (const p of products) {
      for (const f of p.features ?? []) {
        const key = f.name.trim().toLowerCase()
        if (!key || seen.has(key)) continue
        seen.set(key, { name: f.name, slug: key })
      }
    }
    return Array.from(seen.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    )
  }, [products])

  // Initialize price range once we know the max
  useEffect(() => {
    if (products.length > 0 && priceRange === null) {
      setPriceRange([0, priceMax])
    }
  }, [products.length, priceMax, priceRange])

  // Initialize release-year range once we know the bounds
  useEffect(() => {
    if (products.length > 0 && releaseYearRange === null) {
      setReleaseYearRange(releaseYearBounds)
    }
  }, [products.length, releaseYearBounds, releaseYearRange])

  const filteredSorted = useMemo(() => {
    const [minPrice, maxPrice] = priceRange ?? [0, priceMax]
    const [minRating, maxRating] = ratingRange
    const ratingFilterActive = minRating > 0 || maxRating < RATING_SCALE_MAX
    const [minYear, maxYear] = releaseYearRange ?? releaseYearBounds
    const yearFilterActive =
      releaseYearRange !== null &&
      (minYear > releaseYearBounds[0] || maxYear < releaseYearBounds[1])
    const search = searchQuery.trim().toLowerCase()

    const filtered = products.filter((p) => {
      if (search && !p.title.toLowerCase().includes(search)) return false

      if (hideDlcs && p.productType === 'dlc') return false

      const amount = parsePriceAmount(p.price.finalMoney?.amount)
      if (amount < minPrice || amount > maxPrice) return false

      if (ratingFilterActive) {
        const rating = normalizeRating(p.reviewsRating)
        if (rating < minRating || rating > maxRating) return false
      }

      if (yearFilterActive) {
        const y = p.releaseDate ? new Date(p.releaseDate).getFullYear() : NaN
        if (!Number.isFinite(y)) return false
        if (y < minYear || y > maxYear) return false
      }

      if (maxPegiAge !== null) {
        const age = getPegiAge(p.ratings)
        if (age === null || age > maxPegiAge) return false
      }

      if (selectedGenres.length > 0) {
        const productGenres =
          p.genres?.map((g) => g.name.trim().toLowerCase()) ?? []
        if (!selectedGenres.some((s) => productGenres.includes(s))) return false
      }

      if (selectedFeatures.length > 0) {
        const productFeatures =
          p.features?.map((f) => f.name.trim().toLowerCase()) ?? []
        if (!selectedFeatures.every((s) => productFeatures.includes(s)))
          return false
      }

      if (selectedOS.length > 0) {
        const productOS = p.operatingSystems ?? []
        if (!selectedOS.some((os) => productOS.includes(os))) return false
      }

      return true
    })

    const sorted = [...filtered]
    switch (sortBy) {
      case 'discount':
        sorted.sort(
          (a, b) =>
            parseDiscountPercent(b.price.discount) -
            parseDiscountPercent(a.price.discount)
        )
        break
      case 'price-asc':
        sorted.sort(
          (a, b) =>
            parsePriceAmount(a.price.finalMoney?.amount) -
            parsePriceAmount(b.price.finalMoney?.amount)
        )
        break
      case 'price-desc':
        sorted.sort(
          (a, b) =>
            parsePriceAmount(b.price.finalMoney?.amount) -
            parsePriceAmount(a.price.finalMoney?.amount)
        )
        break
      case 'trending':
      default:
        // server already returns by trending, preserve order
        break
    }
    return sorted
  }, [
    products,
    priceRange,
    priceMax,
    ratingRange,
    releaseYearRange,
    releaseYearBounds,
    maxPegiAge,
    selectedGenres,
    selectedFeatures,
    selectedOS,
    searchQuery,
    hideDlcs,
    sortBy
  ])

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / pageSize))

  // Reset to page 1 when filters/sort/data change
  useEffect(() => {
    setPage(1)
  }, [
    sortBy,
    selectedGenres,
    selectedFeatures,
    selectedOS,
    priceRange,
    ratingRange,
    releaseYearRange,
    maxPegiAge,
    searchQuery,
    hideDlcs,
    pageSize,
    products
  ])

  const clampedPage = Math.min(page, totalPages)
  const paginated = useMemo(
    () =>
      filteredSorted.slice(
        (clampedPage - 1) * pageSize,
        clampedPage * pageSize
      ),
    [filteredSorted, clampedPage, pageSize]
  )

  const hasActiveFilters =
    selectedGenres.length > 0 ||
    selectedFeatures.length > 0 ||
    selectedOS.length > 0 ||
    sortBy !== 'trending' ||
    ratingRange[0] !== 0 ||
    ratingRange[1] !== RATING_SCALE_MAX ||
    maxPegiAge !== null ||
    searchQuery.trim() !== '' ||
    hideDlcs ||
    (priceRange !== null &&
      (priceRange[0] !== 0 || priceRange[1] !== priceMax)) ||
    (releaseYearRange !== null &&
      (releaseYearRange[0] !== releaseYearBounds[0] ||
        releaseYearRange[1] !== releaseYearBounds[1]))

  const handleReset = () => {
    setSortBy('trending')
    setSelectedGenres([])
    setSelectedFeatures([])
    setSelectedOS([])
    setPriceRange([0, priceMax])
    setRatingRange([0, RATING_SCALE_MAX])
    setReleaseYearRange(releaseYearBounds)
    setMaxPegiAge(null)
    setSearchQuery('')
    setHideDlcs(false)
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="discountsScreen">
      <div className="discountsScreen__topbar">
        <h2 className="discountsScreen__header">
          {t('discounts.title', 'Games Discounts')}
          {!loading && products.length > 0 && (
            <span className="discountsScreen__count">
              {t('discounts.countFiltered', '{{shown}} of {{total}} games', {
                shown: filteredSorted.length,
                total: products.length
              })}
            </span>
          )}
        </h2>

        <div className="discountsScreen__region">
          <label
            className="discountsScreen__regionLabel"
            htmlFor="discountsScreen__regionSelect"
          >
            {t('discounts.region.label', 'Store region')}
          </label>
          <Select
            id="discountsScreen__regionSelect"
            size="small"
            value={regionOverride ?? ''}
            onChange={(e) => {
              const value = e.target.value
              handleRegionChange(value === '' ? null : value)
            }}
            className="discountsScreen__regionSelect"
            renderValue={(value) => {
              if (!value) {
                return t('discounts.region.auto', 'Auto ({{code}})', {
                  code: `${localeSettings.countryCode} · ${localeSettings.currencyCode}`
                })
              }
              const match = REGION_OPTIONS.find((r) => r.countryCode === value)
              if (!match) return value
              return `${match.label} · ${match.currencyCode}`
            }}
          >
            <MenuItem value="">
              {t('discounts.region.auto', 'Auto ({{code}})', {
                code: `${localeSettings.countryCode} · ${localeSettings.currencyCode}`
              })}
            </MenuItem>
            {REGION_OPTIONS.map((r) => (
              <MenuItem key={r.countryCode} value={r.countryCode}>
                {r.label}
                <span className="discountsScreen__regionCurrency">
                  {r.currencyCode}
                </span>
              </MenuItem>
            ))}
          </Select>
        </div>
      </div>

      {loading && (
        <UpdateComponent
          message={t('discounts.loading', 'Loading discounted games...')}
        />
      )}

      {!loading && error && <p className="discountsScreen__message">{error}</p>}

      {!loading && !error && products.length === 0 && (
        <p className="discountsScreen__message">
          {t('discounts.empty', 'No discounted games available right now.')}
        </p>
      )}

      {!loading && !error && products.length > 0 && (
        <>
          <DiscountFilters
            sortBy={sortBy}
            onSortChange={setSortBy}
            priceMax={priceMax}
            priceRange={priceRange ?? [0, priceMax]}
            onPriceChange={setPriceRange}
            currencyCode={localeSettings.currencyCode}
            ratingRange={ratingRange}
            onRatingChange={setRatingRange}
            releaseYearBounds={releaseYearBounds}
            releaseYearRange={releaseYearRange ?? releaseYearBounds}
            onReleaseYearChange={setReleaseYearRange}
            maxPegiAge={maxPegiAge}
            onMaxPegiAgeChange={setMaxPegiAge}
            genreOptions={genreOptions}
            selectedGenres={selectedGenres}
            onGenresChange={setSelectedGenres}
            featureOptions={featureOptions}
            selectedFeatures={selectedFeatures}
            onFeaturesChange={setSelectedFeatures}
            selectedOS={selectedOS}
            onOSChange={setSelectedOS}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            hideDlcs={hideDlcs}
            onHideDlcsChange={setHideDlcs}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            onReset={handleReset}
            hasActiveFilters={hasActiveFilters}
          />

          {paginated.length === 0 ? (
            <p className="discountsScreen__message">
              {t('discounts.noMatches', 'No games match the current filters.')}
            </p>
          ) : (
            <div className="discountsScreen__grid">
              {paginated.map((product) => (
                <DiscountCard key={product.id} product={product} />
              ))}
            </div>
          )}

          <DiscountPagination
            page={clampedPage}
            totalPages={totalPages}
            onChange={handlePageChange}
          />
        </>
      )}
    </div>
  )
}
