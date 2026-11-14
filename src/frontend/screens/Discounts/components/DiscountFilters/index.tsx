import { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { MenuItem } from '@mui/material'
import { Heart, EyeOff, Layers } from 'lucide-react'
import SearchBar from 'frontend/components/UI/SearchBar'
import SelectField from 'frontend/components/UI/SelectField'
import MultiSelectField from 'frontend/components/UI/MultiSelectField'
import RangeSlider from 'frontend/components/UI/RangeSlider'
import { Button, Chip, FilterSection } from 'frontend/components/UI'
import Icon from 'frontend/components/UI/Icon'
import type { CatalogFeature, CatalogGenre } from 'common/types/discounts'
import {
  PAGE_SIZE_OPTIONS,
  PEGI_AGE_OPTIONS,
  RATING_SCALE_MAX,
  type DiscountSort,
  type OsOption,
  type PegiAge
} from '../../helpers'
import './index.scss'

interface Props {
  regionSelector?: ReactNode
  sortBy: DiscountSort
  onSortChange: (sort: DiscountSort) => void
  priceMax: number
  priceRange: [number, number]
  onPriceChange: (range: [number, number]) => void
  currencyCode: string
  ratingRange: [number, number]
  onRatingChange: (range: [number, number]) => void
  releaseYearBounds: [number, number]
  releaseYearRange: [number, number]
  onReleaseYearChange: (range: [number, number]) => void
  maxPegiAge: PegiAge | null
  onMaxPegiAgeChange: (age: PegiAge | null) => void
  genreOptions: CatalogGenre[]
  selectedGenres: string[]
  onGenresChange: (slugs: string[]) => void
  featureOptions: CatalogFeature[]
  selectedFeatures: string[]
  onFeaturesChange: (slugs: string[]) => void
  osOptions: OsOption[]
  selectedOS: OsOption[]
  onOSChange: (slugs: OsOption[]) => void
  showGogOnlyFilters: boolean
  showPriceFilter: boolean
  searchQuery: string
  onSearchChange: (query: string) => void
  hideDlcs: boolean
  onHideDlcsChange: (value: boolean) => void
  hideOwned: boolean
  onHideOwnedChange: (value: boolean) => void
  wishlistOnly: boolean
  onWishlistOnlyChange: (value: boolean) => void
  isGogLoggedIn: boolean
  pageSize: number
  onPageSizeChange: (value: number) => void
  onReset: () => void
  hasActiveFilters: boolean
}

const OS_LABELS: Record<OsOption, string> = {
  windows: 'Windows',
  linux: 'Linux',
  osx: 'macOS',
  xbox: 'Xbox'
}

const DiscountFilters = ({
  sortBy,
  onSortChange,
  priceMax,
  priceRange,
  onPriceChange,
  currencyCode,
  ratingRange,
  onRatingChange,
  releaseYearBounds,
  releaseYearRange,
  onReleaseYearChange,
  maxPegiAge,
  onMaxPegiAgeChange,
  genreOptions,
  selectedGenres,
  onGenresChange,
  featureOptions,
  selectedFeatures,
  onFeaturesChange,
  osOptions,
  selectedOS,
  onOSChange,
  showGogOnlyFilters,
  showPriceFilter,
  searchQuery,
  onSearchChange,
  hideDlcs,
  onHideDlcsChange,
  hideOwned,
  onHideOwnedChange,
  wishlistOnly,
  onWishlistOnlyChange,
  isGogLoggedIn,
  pageSize,
  onPageSizeChange,
  onReset,
  hasActiveFilters,
  regionSelector
}: Props) => {
  const { t } = useTranslation()

  const osLabel = t('discounts.filters.platform', 'Platform')

  const sortOptions: { value: DiscountSort; label: string }[] = [
    { value: 'trending', label: t('discounts.sort.trending', 'Trending') },
    {
      value: 'discount',
      label: t('discounts.sort.discount', 'Biggest discount')
    },
    {
      value: 'price-asc',
      label: t('discounts.sort.priceAsc', 'Price: low to high')
    },
    {
      value: 'price-desc',
      label: t('discounts.sort.priceDesc', 'Price: high to low')
    },
    {
      value: 'release-desc',
      label: t('discounts.sort.releaseDesc', 'Release date: new to old')
    },
    {
      value: 'release-asc',
      label: t('discounts.sort.releaseAsc', 'Release date: old to new')
    },
    {
      value: 'rating-desc',
      label: t('discounts.sort.ratingDesc', 'Rating: high to low')
    },
    {
      value: 'rating-asc',
      label: t('discounts.sort.ratingAsc', 'Rating: low to high')
    }
  ]

  return (
    <aside
      className="discountFilters"
      aria-label={t('header.filters', 'Filters')}
    >
      <div className="discountFilters__sticky">
        <div className="discountFilters__head">
          <h3 className="discountFilters__title">
            {t('header.filters', 'Filters')}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            disabled={!hasActiveFilters}
          >
            {t('header.reset', 'Reset')}
          </Button>
        </div>

        <SearchBar
          value={searchQuery}
          onInputChanged={onSearchChange}
          placeholder={t('search', 'Search for games')}
        />
      </div>

      <div className="discountFilters__sections">
        {regionSelector && (
          <FilterSection className="discountFilters__regionSection">
            {regionSelector}
          </FilterSection>
        )}

        <FilterSection label={t('discounts.filters.sort', 'Sort by')}>
          <SelectField
            htmlId="discountFilters__sort"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as DiscountSort)}
            extraClass="discountFilters__dropdown"
          >
            {sortOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </SelectField>
        </FilterSection>

        {showGogOnlyFilters && genreOptions.length > 0 && (
          <FilterSection label={t('discounts.filters.genres', 'Genres')}>
            <MultiSelectField
              htmlId="discountFilters__genres"
              values={selectedGenres}
              onChange={onGenresChange}
              placeholder={t('discounts.filters.genresPlaceholder', 'Any genre')}
              options={genreOptions.map((genre) => ({
                value: genre.slug,
                label: genre.name
              }))}
              extraClass="discountFilters__dropdown"
            />
          </FilterSection>
        )}

        {featureOptions.length > 0 && (
          <FilterSection label={t('discounts.filters.features', 'Features')}>
            <MultiSelectField
              htmlId="discountFilters__features"
              values={selectedFeatures}
              onChange={onFeaturesChange}
              placeholder={t(
                'discounts.filters.featuresPlaceholder',
                'Any feature'
              )}
              options={featureOptions.map((feature) => ({
                value: feature.slug,
                label: feature.name
              }))}
              extraClass="discountFilters__dropdown"
            />
          </FilterSection>
        )}

        {osOptions.length > 0 && (
          <FilterSection label={osLabel}>
            <MultiSelectField
              htmlId="discountFilters__platform"
              values={selectedOS}
              onChange={(values) => onOSChange(values as OsOption[])}
              placeholder={t('discounts.filters.platformAny', 'Any platform')}
              options={osOptions.map((os) => ({
                value: os,
                label: OS_LABELS[os]
              }))}
              extraClass="discountFilters__dropdown"
            />
          </FilterSection>
        )}

        {showGogOnlyFilters && (
          <FilterSection
            label={t('discounts.filters.ageRating', 'Suitable for age')}
          >
            <SelectField
              htmlId="discountFilters__age"
              value={maxPegiAge === null ? 'all' : String(maxPegiAge)}
              onChange={(e) =>
                onMaxPegiAgeChange(
                  e.target.value === 'all'
                    ? null
                    : (Number(e.target.value) as PegiAge)
                )
              }
              extraClass="discountFilters__dropdown"
            >
              <MenuItem value="all">
                {t('discounts.filters.ageRatingAll', 'All')}
              </MenuItem>
              {PEGI_AGE_OPTIONS.map((age) => (
                <MenuItem key={age} value={String(age)}>
                  {t(
                    'discounts.filters.ageRatingOption',
                    'PEGI {{age}} or lower',
                    { age }
                  )}
                </MenuItem>
              ))}
            </SelectField>
          </FilterSection>
        )}

        {showPriceFilter && (
          <FilterSection label={t('discounts.filters.price', 'Price')}>
            <RangeSlider
              value={priceRange}
              onChange={onPriceChange}
              min={0}
              max={priceMax}
              step={1}
              ariaLabel={t('discounts.filters.price', 'Price')}
              valueLabel={`${currencyCode} ${priceRange[0].toFixed(
                0
              )} – ${priceRange[1].toFixed(0)}`}
              minLabel={`${currencyCode} 0`}
              maxLabel={`${currencyCode} ${priceMax}`}
            />
          </FilterSection>
        )}

        {showGogOnlyFilters && (
          <FilterSection label={t('discounts.filters.rating', 'Rating')}>
            <RangeSlider
              value={ratingRange}
              onChange={onRatingChange}
              min={0}
              max={RATING_SCALE_MAX}
              step={0.5}
              ariaLabel={t('discounts.filters.rating', 'Rating')}
              valueLabel={`${ratingRange[0].toFixed(1)} – ${ratingRange[1].toFixed(
                1
              )}`}
              minLabel="0.0"
              maxLabel={RATING_SCALE_MAX.toFixed(1)}
            />
          </FilterSection>
        )}

        {showGogOnlyFilters && (
          <FilterSection
            label={t('discounts.filters.releaseYear', 'Release year')}
          >
            <RangeSlider
              value={releaseYearRange}
              onChange={onReleaseYearChange}
              min={releaseYearBounds[0]}
              max={releaseYearBounds[1]}
              step={1}
              disabled={releaseYearBounds[0] === releaseYearBounds[1]}
              ariaLabel={t('discounts.filters.releaseYear', 'Release year')}
              valueLabel={`${releaseYearRange[0]} – ${releaseYearRange[1]}`}
              minLabel={releaseYearBounds[0]}
              maxLabel={releaseYearBounds[1]}
            />
          </FilterSection>
        )}

        <FilterSection label={t('discounts.filters.pageSize', 'Per page')}>
          <SelectField
            htmlId="discountFilters__pageSize"
            value={String(pageSize)}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            extraClass="discountFilters__dropdown"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <MenuItem key={n} value={String(n)}>
                {n}
              </MenuItem>
            ))}
          </SelectField>
        </FilterSection>

        {showGogOnlyFilters && (
          <FilterSection label={t('header.display', 'Display')}>
            {isGogLoggedIn && (
              <>
                <Chip
                  active={wishlistOnly}
                  icon={<Icon glyph={Heart} size="md" />}
                  onClick={() => onWishlistOnlyChange(!wishlistOnly)}
                >
                  {t('discounts.filters.wishlistOnly', 'Wishlist only')}
                </Chip>
                <Chip
                  active={hideOwned}
                  icon={<Icon glyph={EyeOff} size="md" />}
                  onClick={() => onHideOwnedChange(!hideOwned)}
                >
                  {t('discounts.filters.hideOwned', 'Hide owned')}
                </Chip>
              </>
            )}
            <Chip
              active={hideDlcs}
              icon={<Icon glyph={Layers} size="md" />}
              onClick={() => onHideDlcsChange(!hideDlcs)}
            >
              {t('discounts.filters.hideDlcs', 'Hide DLCs')}
            </Chip>
          </FilterSection>
        )}
      </div>
    </aside>
  )
}

export default DiscountFilters
