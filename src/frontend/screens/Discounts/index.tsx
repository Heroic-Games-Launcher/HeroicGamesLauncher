import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MenuItem, Select } from '@mui/material'

import { UpdateComponent } from 'frontend/components/UI'
import type {
  CatalogFeature,
  CatalogGenre,
  CatalogProduct,
  DiscountStore
} from 'common/types/discounts'
import DiscountCard from './components/DiscountCard'
import DiscountFilters from './components/DiscountFilters'
import DiscountPagination from './components/DiscountPagination'
import {
  DEFAULT_PAGE_SIZE,
  getGmgAutoCurrency,
  getLocaleSettings,
  getPegiAge,
  getStoredGmgCurrency,
  getStoredRegionOverride,
  isMatureProduct,
  GMG_CURRENCIES,
  loadStoredFilters,
  normalizeRating,
  OS_OPTIONS,
  parseDiscountPercent,
  parsePriceAmount,
  parseReleaseTimestamp,
  RATING_SCALE_MAX,
  REGION_OPTIONS,
  saveStoredFilters,
  STORE_OPTIONS,
  setStoredGmgCurrency,
  setStoredRegionOverride,
  type DiscountSort,
  type OsOption,
  type PegiAge,
  type StoreTab
} from './helpers'
import './index.css'
import ContextProvider from 'frontend/state/ContextProvider'

export default function Discounts() {
  const { t, i18n } = useTranslation()
  const [regionOverride, setRegionOverride] = useState<string | null>(() =>
    getStoredRegionOverride()
  )
  const localeSettings = useMemo(
    () => getLocaleSettings(i18n.language, regionOverride),
    [i18n.language, regionOverride]
  )
  const [gmgCurrencyOverride, setGmgCurrencyOverride] = useState<string | null>(
    () => getStoredGmgCurrency()
  )
  const gmgCurrency =
    gmgCurrencyOverride ?? getGmgAutoCurrency(localeSettings.currencyCode)

  const handleGmgCurrencyChange = (currency: string | null) => {
    setGmgCurrencyOverride(currency)
    setStoredGmgCurrency(currency)
  }

  const currencyName = (code: string): string => {
    try {
      return (
        new Intl.DisplayNames([i18n.language.replace('_', '-')], {
          type: 'currency'
        }).of(code === 'TRL' ? 'TRY' : code) ?? code
      )
    } catch {
      return code
    }
  }
  const { gog } = useContext(ContextProvider)
  const isGogLoggedIn: boolean = !!gog?.username

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
    setShowMature(false)
    setHideOwned(false)
    setWishlistOnly(false)
  }

  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Rehydrate filter state from localStorage once on mount.
  const storedFilters = useMemo(loadStoredFilters, [])

  const [sortBy, setSortBy] = useState<DiscountSort>(
    storedFilters.sortBy ?? 'trending'
  )
  const [selectedGenres, setSelectedGenres] = useState<string[]>(
    storedFilters.selectedGenres ?? []
  )
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(
    storedFilters.selectedFeatures ?? []
  )
  const [selectedOS, setSelectedOS] = useState<OsOption[]>(
    storedFilters.selectedOS ?? []
  )
  const [storeTab, setStoreTab] = useState<StoreTab>(
    storedFilters.storeTab ?? 'all'
  )
  // Price and release-year ranges are bound to the loaded data's min/max,
  // which changes with the active tab, region, and currency — so they are
  // seeded fresh on each load rather than persisted (a stored range from
  // another tab/currency would silently filter the current one).
  const [priceRange, setPriceRange] = useState<[number, number] | null>(null)
  const [ratingRange, setRatingRange] = useState<[number, number]>(
    storedFilters.ratingRange ?? [0, RATING_SCALE_MAX]
  )
  const [releaseYearRange, setReleaseYearRange] = useState<
    [number, number] | null
  >(null)
  const [maxPegiAge, setMaxPegiAge] = useState<PegiAge | null>(
    storedFilters.maxPegiAge ?? null
  )
  const [searchQuery, setSearchQuery] = useState(
    storedFilters.searchQuery ?? ''
  )
  const [hideDlcs, setHideDlcs] = useState(storedFilters.hideDlcs ?? false)
  const [showMature, setShowMature] = useState(
    storedFilters.showMature ?? false
  )
  const [hideOwned, setHideOwned] = useState(storedFilters.hideOwned ?? false)
  const [wishlistOnly, setWishlistOnly] = useState(
    storedFilters.wishlistOnly ?? false
  )
  const [pageSize, setPageSize] = useState<number>(
    storedFilters.pageSize ?? DEFAULT_PAGE_SIZE
  )
  const [page, setPage] = useState(1)

  // Track whether we've already completed a load, so locale-change reloads
  // know to clear the data-bound ranges (price/releaseYear), but the very
  // first load preserves whatever was restored from localStorage.
  const hasLoadedOnceRef = useRef(false)

  // Persist filter state so it survives navigation and page reloads.
  useEffect(() => {
    saveStoredFilters({
      sortBy,
      selectedGenres,
      selectedFeatures,
      selectedOS,
      storeTab,
      ratingRange,
      maxPegiAge,
      searchQuery,
      hideDlcs,
      showMature,
      hideOwned,
      wishlistOnly,
      pageSize
    })
  }, [
    sortBy,
    selectedGenres,
    selectedFeatures,
    selectedOS,
    storeTab,
    ratingRange,
    maxPegiAge,
    searchQuery,
    hideDlcs,
    showMature,
    hideOwned,
    wishlistOnly,
    pageSize
  ])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      setProducts([])

      try {
        // A GMG feed failure must not take down the GOG deals
        const [gogResult, gmgResult] = await Promise.all([
          window.api.getGogDiscounts(localeSettings, hideOwned, wishlistOnly),
          window.api.getGmgDiscounts(gmgCurrency).catch((err: unknown) => {
            window.api.logError(`Failed to fetch GMG discounts: ${String(err)}`)
            return [] as CatalogProduct[]
          })
        ])
        if (!cancelled) {
          setProducts([...gogResult, ...gmgResult])
          // Only clear data-bound ranges when this is a reload caused by a
          // locale change. On the very first load after mount we keep the
          // values restored from localStorage so persisted filters survive.
          if (hasLoadedOnceRef.current) {
            setPriceRange(null)
            setReleaseYearRange(null)
          }
          hasLoadedOnceRef.current = true
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
  }, [localeSettings, gmgCurrency, hideOwned, wishlistOnly, t])

  // Filter options and bounds derive from the active tab's products.
  const tabProducts = useMemo(
    () =>
      storeTab === 'all'
        ? products
        : products.filter((p) => (p.store ?? 'gog') === storeTab),
    [products, storeTab]
  )

  const priceMax = useMemo(() => {
    const max = tabProducts.reduce((acc, p) => {
      const amount = parsePriceAmount(p.price.finalMoney?.amount)
      return amount > acc ? amount : acc
    }, 0)
    return Math.max(1, Math.ceil(max))
  }, [tabProducts])

  const releaseYearBounds = useMemo<[number, number]>(() => {
    const currentYear = new Date().getFullYear()
    let min = currentYear
    let max = currentYear
    let found = false
    for (const p of tabProducts) {
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
  }, [tabProducts])

  // GOG sometimes returns multiple slugs for the same display name (e.g.
  // "Multi-player"). Dedup by normalized name so the picker shows each label
  // once, and treat that normalized name as the canonical key used for
  // filtering.
  const genreOptions = useMemo<CatalogGenre[]>(() => {
    const seen = new Map<string, CatalogGenre>()
    for (const p of tabProducts) {
      for (const g of p.genres ?? []) {
        const key = g.name.trim().toLowerCase()
        if (!key || seen.has(key)) continue
        seen.set(key, { name: g.name, slug: key })
      }
    }
    return Array.from(seen.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    )
  }, [tabProducts])

  const featureOptions = useMemo<CatalogFeature[]>(() => {
    const seen = new Map<string, CatalogFeature>()
    for (const p of tabProducts) {
      for (const f of p.features ?? []) {
        const key = f.name.trim().toLowerCase()
        if (!key || seen.has(key)) continue
        seen.set(key, { name: f.name, slug: key })
      }
    }
    return Array.from(seen.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    )
  }, [tabProducts])

  const storeOptions = useMemo<DiscountStore[]>(() => {
    const present = new Set<DiscountStore>()
    for (const p of products) present.add(p.store ?? 'gog')
    return STORE_OPTIONS.filter((s) => present.has(s))
  }, [products])
  const gmgPresent = storeOptions.includes('gmg')

  // Rating/PEGI/genre/release-year/DLC data only exists on GOG items, so
  // those filters are hidden AND skipped unless the shown set is GOG-only:
  // the GOG tab, or any tab when GMG contributes nothing.
  const showGogOnlyFilters = storeTab === 'gog' || !gmgPresent
  // The price range needs a single currency; on the mixed "all" tab (region
  // currency for GOG, gmgCurrency for GMG) it is hidden and not applied.
  const showPriceFilter = !(storeTab === 'all' && gmgPresent)

  const osOptions = useMemo<OsOption[]>(() => {
    const present = new Set<string>()
    for (const p of tabProducts) {
      for (const os of p.operatingSystems ?? []) present.add(os)
    }
    return OS_OPTIONS.filter((os) => present.has(os))
  }, [tabProducts])

  // A persisted tab whose store has no items would strand the grid on an
  // empty selection with the tab bar hidden
  useEffect(() => {
    if (
      storeTab !== 'all' &&
      products.length > 0 &&
      !storeOptions.includes(storeTab)
    ) {
      setStoreTab('all')
    }
  }, [storeTab, storeOptions, products.length])

  // Each tab has its own price/year scale, so re-seed those ranges from the
  // new tab's bounds on every tab change.
  const prevStoreTabRef = useRef(storeTab)
  useEffect(() => {
    if (prevStoreTabRef.current !== storeTab) {
      prevStoreTabRef.current = storeTab
      setPriceRange(null)
      setReleaseYearRange(null)
    }
  }, [storeTab])

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
    const ratingFilterActive =
      showGogOnlyFilters && (minRating > 0 || maxRating < RATING_SCALE_MAX)
    const [minYear, maxYear] = releaseYearRange ?? releaseYearBounds
    const yearFilterActive =
      showGogOnlyFilters &&
      releaseYearRange !== null &&
      (minYear > releaseYearBounds[0] || maxYear < releaseYearBounds[1])
    const search = searchQuery.trim().toLowerCase()

    // Only constrain by OS/feature values the active tab actually offers: a
    // selection carried over from another tab (e.g. Linux, absent from GMG)
    // must be ignored, not silently empty the grid.
    const availableOS = new Set(osOptions)
    const effectiveOS = selectedOS.filter((os) => availableOS.has(os))
    const availableFeatures = new Set(featureOptions.map((f) => f.slug))
    const effectiveFeatures = selectedFeatures.filter((s) =>
      availableFeatures.has(s)
    )

    const filtered = tabProducts.filter((p) => {
      if (search && !p.title.toLowerCase().includes(search)) return false

      if (showGogOnlyFilters && hideDlcs && p.productType === 'dlc')
        return false

      if (!showMature && isMatureProduct(p.tags, p.ratings)) return false

      const amount = parsePriceAmount(p.price.finalMoney?.amount)
      if (amount < minPrice || amount > maxPrice) return false
      if (showPriceFilter) {
        const amount = parsePriceAmount(p.price.finalMoney?.amount)
        if (amount < minPrice || amount > maxPrice) return false
      }

      if (ratingFilterActive) {
        const rating = normalizeRating(p.reviewsRating)
        if (rating < minRating || rating > maxRating) return false
      }

      if (yearFilterActive) {
        const y = p.releaseDate ? new Date(p.releaseDate).getFullYear() : NaN
        if (!Number.isFinite(y)) return false
        if (y < minYear || y > maxYear) return false
      }

      if (showGogOnlyFilters && maxPegiAge !== null) {
        const age = getPegiAge(p.ratings)
        if (age === null || age > maxPegiAge) return false
      }

      if (showGogOnlyFilters && selectedGenres.length > 0) {
        const productGenres =
          p.genres?.map((g) => g.name.trim().toLowerCase()) ?? []
        if (!selectedGenres.some((s) => productGenres.includes(s))) return false
      }

      if (effectiveFeatures.length > 0) {
        const productFeatures =
          p.features?.map((f) => f.name.trim().toLowerCase()) ?? []
        if (!effectiveFeatures.every((s) => productFeatures.includes(s)))
          return false
      }

      if (effectiveOS.length > 0) {
        const productOS = p.operatingSystems ?? []
        if (!effectiveOS.some((os) => productOS.includes(os))) return false
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
      case 'release-asc':
      case 'release-desc': {
        // Games without a release date sink to the bottom of either sort
        // direction so they don't unexpectedly lead the list.
        const dir = sortBy === 'release-asc' ? 1 : -1
        sorted.sort((a, b) => {
          const ta = parseReleaseTimestamp(a.releaseDate)
          const tb = parseReleaseTimestamp(b.releaseDate)
          const aMissing = Number.isNaN(ta)
          const bMissing = Number.isNaN(tb)
          if (aMissing && bMissing) return 0
          if (aMissing) return 1
          if (bMissing) return -1
          return (ta - tb) * dir
        })
        break
      }
      case 'rating-asc':
      case 'rating-desc': {
        // Unrated games (missing or zero) sink to the bottom regardless of
        // direction, so low-end sort doesn't get flooded by unrated entries.
        const dir = sortBy === 'rating-asc' ? 1 : -1
        sorted.sort((a, b) => {
          const ra = a.reviewsRating ?? 0
          const rb = b.reviewsRating ?? 0
          const aMissing = ra <= 0
          const bMissing = rb <= 0
          if (aMissing && bMissing) return 0
          if (aMissing) return 1
          if (bMissing) return -1
          return (ra - rb) * dir
        })
        break
      }
      case 'trending':
      default:
        // server already returns by trending, preserve order
        break
    }
    return sorted
  }, [
    tabProducts,
    showGogOnlyFilters,
    showPriceFilter,
    priceRange,
    priceMax,
    ratingRange,
    releaseYearRange,
    releaseYearBounds,
    maxPegiAge,
    selectedGenres,
    selectedFeatures,
    selectedOS,
    osOptions,
    featureOptions,
    searchQuery,
    hideDlcs,
    showMature,
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
    storeTab,
    priceRange,
    ratingRange,
    releaseYearRange,
    maxPegiAge,
    searchQuery,
    hideDlcs,
    showMature,
    hideOwned,
    wishlistOnly,
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

  const hasActiveGogOnlyFilters =
    selectedGenres.length > 0 ||
    ratingRange[0] !== 0 ||
    ratingRange[1] !== RATING_SCALE_MAX ||
    maxPegiAge !== null ||
    hideDlcs ||
    showMature ||
    hideOwned ||
    wishlistOnly ||
    (releaseYearRange !== null &&
      (releaseYearRange[0] !== releaseYearBounds[0] ||
        releaseYearRange[1] !== releaseYearBounds[1]))

  const hasActiveFilters =
    (showGogOnlyFilters && hasActiveGogOnlyFilters) ||
    selectedFeatures.length > 0 ||
    selectedOS.length > 0 ||
    sortBy !== 'trending' ||
    searchQuery.trim() !== '' ||
    (showPriceFilter &&
      priceRange !== null &&
      (priceRange[0] !== 0 || priceRange[1] !== priceMax))

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
    setShowMature(false)
    setHideOwned(false)
    setWishlistOnly(false)
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="discountsScreen">
      <div className="discountsScreen__topbar">
        <h2 className="discountsScreen__header">
          {t('discounts.titleMulti', 'Deals')}
        </h2>

        {storeOptions.length > 1 && (
          <div
            className="discountsScreen__storeTabs"
            role="tablist"
            aria-label={t('discounts.tabs.label', 'Store')}
          >
            {(['all', ...storeOptions] as StoreTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={storeTab === tab}
                className={`discountsScreen__storeTab${
                  storeTab === tab ? ' discountsScreen__storeTab--active' : ''
                }`}
                onClick={() => setStoreTab(tab)}
              >
                {tab === 'all'
                  ? t('discounts.tabs.all', 'All stores')
                  : tab.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        {storeTab === 'gmg' ? (
          <div className="discountsScreen__region">
            <label
              className="discountsScreen__regionLabel"
              htmlFor="discountsScreen__currencySelect"
            >
              {t('discounts.currency.label', 'Currency')}
            </label>
            <Select
              id="discountsScreen__currencySelect"
              size="small"
              value={gmgCurrencyOverride ?? ''}
              onChange={(e) => {
                const value = e.target.value
                handleGmgCurrencyChange(value === '' ? null : value)
              }}
              className="discountsScreen__regionSelect"
              renderValue={(value) => {
                if (!value) {
                  return t('discounts.region.auto', 'Auto ({{code}})', {
                    code: gmgCurrency
                  })
                }
                return `${currencyName(value)} · ${value}`
              }}
            >
              <MenuItem value="">
                {t('discounts.region.auto', 'Auto ({{code}})', {
                  code: gmgCurrency
                })}
              </MenuItem>
              {GMG_CURRENCIES.map((currency) => (
                <MenuItem key={currency} value={currency}>
                  {currencyName(currency)}
                  <span className="discountsScreen__regionCurrency">
                    {currency}
                  </span>
                </MenuItem>
              ))}
            </Select>
          </div>
        ) : (
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
                const match = REGION_OPTIONS.find(
                  (r) => r.countryCode === value
                )
                if (!match) return value
                const label = t(
                  `discounts.region.countries.${match.countryCode}`,
                  match.label
                )
                return `${label} · ${match.currencyCode}`
              }}
            >
              <MenuItem value="">
                {t('discounts.region.auto', 'Auto ({{code}})', {
                  code: `${localeSettings.countryCode} · ${localeSettings.currencyCode}`
                })}
              </MenuItem>
              {REGION_OPTIONS.map((r) => ({
                ...r,
                localizedLabel: t(
                  `discounts.region.countries.${r.countryCode}`,
                  r.label
                )
              }))
                .sort((a, b) =>
                  a.localizedLabel.localeCompare(
                    b.localizedLabel,
                    i18n.language.replace('_', '-')
                  )
                )
                .map((r) => (
                  <MenuItem key={r.countryCode} value={r.countryCode}>
                    {r.localizedLabel}
                    <span className="discountsScreen__regionCurrency">
                      {r.currencyCode}
                    </span>
                  </MenuItem>
                ))}
            </Select>
          </div>
        )}
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
            currencyCode={
              storeTab === 'gmg' ? gmgCurrency : localeSettings.currencyCode
            }
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
            osOptions={osOptions}
            selectedOS={selectedOS}
            onOSChange={setSelectedOS}
            showGogOnlyFilters={showGogOnlyFilters}
            showPriceFilter={showPriceFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            hideDlcs={hideDlcs}
            onHideDlcsChange={setHideDlcs}
            showMature={showMature}
            onShowMatureChange={setShowMature}
            hideOwned={hideOwned}
            onHideOwnedChange={setHideOwned}
            wishlistOnly={wishlistOnly}
            onWishlistOnlyChange={setWishlistOnly}
            isGogLoggedIn={isGogLoggedIn}
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
