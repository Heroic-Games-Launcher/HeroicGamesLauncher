import { useTranslation } from 'react-i18next'
import {
  Autocomplete,
  Chip,
  MenuItem,
  Select,
  Slider,
  TextField
} from '@mui/material'
import type { CatalogFeature, CatalogGenre } from 'common/types/discounts'
import {
  MAX_GENRE_SELECTIONS,
  OS_OPTIONS,
  RATING_SCALE_MAX,
  type DiscountSort,
  type OsOption
} from '../../helpers'
import './index.css'

interface Props {
  sortBy: DiscountSort
  onSortChange: (sort: DiscountSort) => void
  priceMax: number
  priceRange: [number, number]
  onPriceChange: (range: [number, number]) => void
  currencyCode: string
  ratingRange: [number, number]
  onRatingChange: (range: [number, number]) => void
  genreOptions: CatalogGenre[]
  selectedGenres: string[]
  onGenresChange: (slugs: string[]) => void
  featureOptions: CatalogFeature[]
  selectedFeatures: string[]
  onFeaturesChange: (slugs: string[]) => void
  selectedOS: OsOption[]
  onOSChange: (slugs: OsOption[]) => void
  onReset: () => void
  hasActiveFilters: boolean
}

const OS_LABEL_FALLBACK: Record<OsOption, string> = {
  windows: 'Windows',
  linux: 'Linux',
  osx: 'macOS'
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
  genreOptions,
  selectedGenres,
  onGenresChange,
  featureOptions,
  selectedFeatures,
  onFeaturesChange,
  selectedOS,
  onOSChange,
  onReset,
  hasActiveFilters
}: Props) => {
  const { t } = useTranslation()

  const toggleOS = (os: OsOption) => {
    onOSChange(
      selectedOS.includes(os)
        ? selectedOS.filter((o) => o !== os)
        : [...selectedOS, os]
    )
  }

  return (
    <div className="discountFilters">
      <div className="discountFilters__field">
        <label className="discountFilters__label">
          {t('discounts.filters.genres', 'Genres')} ({selectedGenres.length}/
          {MAX_GENRE_SELECTIONS})
        </label>
        <Autocomplete
          multiple
          size="small"
          options={genreOptions}
          value={genreOptions.filter((g) => selectedGenres.includes(g.slug))}
          onChange={(_, value) => onGenresChange(value.map((g) => g.slug))}
          getOptionLabel={(g) => g.name}
          isOptionEqualToValue={(a, b) => a.slug === b.slug}
          getOptionDisabled={(option) =>
            selectedGenres.length >= MAX_GENRE_SELECTIONS &&
            !selectedGenres.includes(option.slug)
          }
          renderTags={(value, getTagProps) =>
            value.map((option, index) => {
              const { key, ...rest } = getTagProps({ index })
              return (
                <Chip key={key} size="small" label={option.name} {...rest} />
              )
            })
          }
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder={
                selectedGenres.length === 0
                  ? t('discounts.filters.genresPlaceholder', 'Any genre')
                  : ''
              }
            />
          )}
          className="discountFilters__autocomplete"
        />
      </div>

      <div className="discountFilters__field">
        <label className="discountFilters__label">
          {t('discounts.filters.features', 'Features')}
        </label>
        <Autocomplete
          multiple
          size="small"
          options={featureOptions}
          value={featureOptions.filter((f) =>
            selectedFeatures.includes(f.slug)
          )}
          onChange={(_, value) => onFeaturesChange(value.map((f) => f.slug))}
          getOptionLabel={(f) => f.name}
          isOptionEqualToValue={(a, b) => a.slug === b.slug}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => {
              const { key, ...rest } = getTagProps({ index })
              return (
                <Chip key={key} size="small" label={option.name} {...rest} />
              )
            })
          }
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder={
                selectedFeatures.length === 0
                  ? t('discounts.filters.featuresPlaceholder', 'Any feature')
                  : ''
              }
            />
          )}
          className="discountFilters__autocomplete"
        />
      </div>

      <div className="discountFilters__field">
        <label className="discountFilters__label">
          {t('discounts.filters.os', 'Operating system')}
        </label>
        <div className="discountFilters__chips">
          {OS_OPTIONS.map((os) => (
            <Chip
              key={os}
              label={t(`discounts.os.${os}`, OS_LABEL_FALLBACK[os])}
              onClick={() => toggleOS(os)}
              className={`discountFilters__osChip${
                selectedOS.includes(os)
                  ? ' discountFilters__osChip--active'
                  : ''
              }`}
            />
          ))}
        </div>
      </div>

      <div className="discountFilters__field">
        <label className="discountFilters__label">
          {t('discounts.filters.sort', 'Sort by')}
        </label>
        <Select
          size="small"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as DiscountSort)}
          className="discountFilters__select"
        >
          <MenuItem value="trending">
            {t('discounts.sort.trending', 'Trending')}
          </MenuItem>
          <MenuItem value="discount">
            {t('discounts.sort.discount', 'Biggest discount')}
          </MenuItem>
          <MenuItem value="price-asc">
            {t('discounts.sort.priceAsc', 'Price: low to high')}
          </MenuItem>
          <MenuItem value="price-desc">
            {t('discounts.sort.priceDesc', 'Price: high to low')}
          </MenuItem>
        </Select>
      </div>

      <div className="discountFilters__field discountFilters__field--slider">
        <label className="discountFilters__label">
          {t('discounts.filters.price', 'Price')} ({currencyCode}{' '}
          {priceRange[0].toFixed(0)} – {priceRange[1].toFixed(0)})
        </label>
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
      </div>

      <div className="discountFilters__field discountFilters__field--slider">
        <label className="discountFilters__label">
          {t('discounts.filters.rating', 'Rating')} ({ratingRange[0].toFixed(1)}{' '}
          – {ratingRange[1].toFixed(1)})
        </label>
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
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          className="discountFilters__reset"
          onClick={onReset}
        >
          {t('discounts.filters.reset', 'Reset')}
        </button>
      )}
    </div>
  )
}

export default DiscountFilters
