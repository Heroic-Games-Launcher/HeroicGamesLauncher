import { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Slider } from '@mui/material'
import { Heart, EyeOff, Layers } from 'lucide-react'
import SearchBar from 'frontend/components/UI/SearchBar'
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

  const toggleInList = <T,>(list: T[], value: T): T[] =>
    list.includes(value)
      ? list.filter((item) => item !== value)
      : [...list, value]

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

      <FilterSection label={t('discounts.filters.sort', 'Sort by')}>
        {sortOptions.map((option) => (
          <Chip
            key={option.value}
            active={sortBy === option.value}
            onClick={() => onSortChange(option.value)}
          >
            {option.label}
          </Chip>
        ))}
      </FilterSection>

      {regionSelector && (
        <FilterSection className="discountFilters__regionSection">
          {regionSelector}
        </FilterSection>
      )}

      {showGogOnlyFilters && genreOptions.length > 0 && (
        <FilterSection label={t('discounts.filters.genres', 'Genres')}>
          {genreOptions.map((genre) => (
            <Chip
              key={genre.slug}
              active={selectedGenres.includes(genre.slug)}
              onClick={() =>
                onGenresChange(toggleInList(selectedGenres, genre.slug))
              }
            >
              {genre.name}
            </Chip>
          ))}
        </FilterSection>
      )}

      {featureOptions.length > 0 && (
        <FilterSection label={t('discounts.filters.features', 'Features')}>
          {featureOptions.map((feature) => (
            <Chip
              key={feature.slug}
              active={selectedFeatures.includes(feature.slug)}
              onClick={() =>
                onFeaturesChange(toggleInList(selectedFeatures, feature.slug))
              }
            >
              {feature.name}
            </Chip>
          ))}
        </FilterSection>
      )}

      {osOptions.length > 0 && (
        <FilterSection label={osLabel}>
          {osOptions.map((os) => (
            <Chip
              key={os}
              active={selectedOS.includes(os)}
              onClick={() => onOSChange(toggleInList(selectedOS, os))}
            >
              {OS_LABELS[os]}
            </Chip>
          ))}
        </FilterSection>
      )}

      {showGogOnlyFilters && (
        <FilterSection
          label={t('discounts.filters.ageRating', 'Suitable for age')}
        >
          <Chip
            active={maxPegiAge === null}
            onClick={() => onMaxPegiAgeChange(null)}
          >
            {t('discounts.filters.ageRatingAll', 'All')}
          </Chip>
          {PEGI_AGE_OPTIONS.map((age) => (
            <Chip
              key={age}
              active={maxPegiAge === age}
              title={t(
                'discounts.filters.ageRatingOption',
                'Show games rated PEGI {{age}} or lower',
                { age }
              )}
              onClick={() => onMaxPegiAgeChange(age)}
            >
              {age}
            </Chip>
          ))}
        </FilterSection>
      )}

      {showPriceFilter && (
        <FilterSection label={t('discounts.filters.price', 'Price')}>
          <div className="discountFilters__sliderField">
            <span className="discountFilters__sliderValue">
              {currencyCode} {priceRange[0].toFixed(0)} –{' '}
              {priceRange[1].toFixed(0)}
            </span>
            <Slider
              size="small"
              value={priceRange}
              onChange={(_, value) => onPriceChange(value as [number, number])}
              min={0}
              max={priceMax}
              step={1}
              valueLabelDisplay="auto"
              className="discountFilters__slider"
            />
            <div className="discountFilters__sliderBounds">
              <span>{currencyCode} 0</span>
              <span>
                {currencyCode} {priceMax}
              </span>
            </div>
          </div>
        </FilterSection>
      )}

      {showGogOnlyFilters && (
        <FilterSection label={t('discounts.filters.rating', 'Rating')}>
          <div className="discountFilters__sliderField">
            <span className="discountFilters__sliderValue">
              {ratingRange[0].toFixed(1)} – {ratingRange[1].toFixed(1)}
            </span>
            <Slider
              size="small"
              value={ratingRange}
              onChange={(_, value) => onRatingChange(value as [number, number])}
              min={0}
              max={RATING_SCALE_MAX}
              step={0.5}
              valueLabelDisplay="auto"
              className="discountFilters__slider"
            />
            <div className="discountFilters__sliderBounds">
              <span>0.0</span>
              <span>{RATING_SCALE_MAX.toFixed(1)}</span>
            </div>
          </div>
        </FilterSection>
      )}

      {showGogOnlyFilters && (
        <FilterSection
          label={t('discounts.filters.releaseYear', 'Release year')}
        >
          <div className="discountFilters__sliderField">
            <span className="discountFilters__sliderValue">
              {releaseYearRange[0]} – {releaseYearRange[1]}
            </span>
            <Slider
              size="small"
              value={releaseYearRange}
              onChange={(_, value) =>
                onReleaseYearChange(value as [number, number])
              }
              min={releaseYearBounds[0]}
              max={releaseYearBounds[1]}
              step={1}
              valueLabelDisplay="auto"
              disabled={releaseYearBounds[0] === releaseYearBounds[1]}
              className="discountFilters__slider"
            />
            <div className="discountFilters__sliderBounds">
              <span>{releaseYearBounds[0]}</span>
              <span>{releaseYearBounds[1]}</span>
            </div>
          </div>
        </FilterSection>
      )}

      <FilterSection label={t('discounts.filters.pageSize', 'Per page')}>
        {PAGE_SIZE_OPTIONS.map((n) => (
          <Chip
            key={n}
            active={pageSize === n}
            onClick={() => onPageSizeChange(n)}
          >
            {n}
          </Chip>
        ))}
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
    </aside>
  )
}

export default DiscountFilters
