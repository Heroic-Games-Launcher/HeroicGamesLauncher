import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Autocomplete,
  Chip,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  Slider,
  TextField,
  Tooltip
} from '@mui/material'
import { Clear, ExpandMore, Search } from '@mui/icons-material'
import type { CatalogFeature, CatalogGenre } from 'common/types/discounts'
import {
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
  searchQuery: string
  onSearchChange: (query: string) => void
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
  searchQuery,
  onSearchChange,
  onReset,
  hasActiveFilters
}: Props) => {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  const toggleOS = (os: OsOption) => {
    onOSChange(
      selectedOS.includes(os)
        ? selectedOS.filter((o) => o !== os)
        : [...selectedOS, os]
    )
  }

  return (
    <section className="discountFilters" aria-label={t('discounts.filters.title', 'Filters')}>
      <header className="discountFilters__header">
        <h3 className="discountFilters__title">
          {t('discounts.filters.title', 'Filters')}
        </h3>
        <div className="discountFilters__headerActions">
          <button
            type="button"
            className="discountFilters__toggle"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-controls="discountFilters__collapsible"
          >
            <span>
              {expanded
                ? t('discounts.filters.lessFilters', 'Less filters')
                : t('discounts.filters.moreFilters', 'More filters')}
            </span>
            <ExpandMore
              fontSize="small"
              className={`discountFilters__toggleIcon${
                expanded ? ' discountFilters__toggleIcon--open' : ''
              }`}
            />
          </button>
          <button
            type="button"
            className="discountFilters__reset"
            onClick={onReset}
            disabled={!hasActiveFilters}
          >
            {t('discounts.filters.reset', 'Reset')}
          </button>
        </div>
      </header>

      <div className="discountFilters__row discountFilters__row--search">
        <TextField
          size="small"
          fullWidth
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t(
            'discounts.filters.searchPlaceholder',
            'Search games by title...'
          )}
          aria-label={t('discounts.filters.search', 'Search')}
          className="discountFilters__search"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: searchQuery ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  aria-label={t(
                    'discounts.filters.clearSearch',
                    'Clear search'
                  )}
                  onClick={() => onSearchChange('')}
                >
                  <Clear fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : undefined
          }}
        />
      </div>

      <div
        id="discountFilters__collapsible"
        className={`discountFilters__collapsible${
          expanded ? ' discountFilters__collapsible--open' : ''
        }`}
        aria-hidden={!expanded}
      >
        <div className="discountFilters__collapsibleInner">
      <div className="discountFilters__row discountFilters__row--inputs">
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

        <div className="discountFilters__field">
          <label className="discountFilters__label">
            <span>{t('discounts.filters.genres', 'Genres')}</span>
            {selectedGenres.length > 0 && (
              <span className="discountFilters__labelMeta">
                {selectedGenres.length}
              </span>
            )}
          </label>
          <Tooltip
            arrow
            placement="bottom-start"
            disableHoverListener={selectedGenres.length <= 3}
            title={
              selectedGenres.length > 3 ? (
                <div className="discountFilters__tooltipChips">
                  {genreOptions
                    .filter((g) => selectedGenres.includes(g.slug))
                    .map((g) => (
                      <span
                        key={g.slug}
                        className="discountFilters__tooltipChip"
                      >
                        {g.name}
                      </span>
                    ))}
                </div>
              ) : (
                ''
              )
            }
          >
            <Autocomplete
              multiple
              size="small"
              limitTags={2}
              options={genreOptions}
              value={genreOptions.filter((g) =>
                selectedGenres.includes(g.slug)
              )}
              onChange={(_, value) => onGenresChange(value.map((g) => g.slug))}
              getOptionLabel={(g) => g.name}
              isOptionEqualToValue={(a, b) => a.slug === b.slug}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => {
                  const { key, ...rest } = getTagProps({ index })
                  return (
                    <Chip
                      key={key}
                      size="small"
                      label={option.name}
                      {...rest}
                    />
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
          </Tooltip>
        </div>

        <div className="discountFilters__field">
          <label className="discountFilters__label">
            <span>{t('discounts.filters.features', 'Features')}</span>
            {selectedFeatures.length > 0 && (
              <span className="discountFilters__labelMeta">
                {selectedFeatures.length}
              </span>
            )}
          </label>
          <Tooltip
            arrow
            placement="bottom-start"
            disableHoverListener={selectedFeatures.length === 0}
            title={
              selectedFeatures.length > 0 ? (
                <div className="discountFilters__tooltipChips">
                  {featureOptions
                    .filter((f) => selectedFeatures.includes(f.slug))
                    .map((f) => (
                      <span
                        key={f.slug}
                        className="discountFilters__tooltipChip"
                      >
                        {f.name}
                      </span>
                    ))}
                </div>
              ) : (
                ''
              )
            }
          >
            <Autocomplete
              multiple
              size="small"
              limitTags={2}
              options={featureOptions}
              value={featureOptions.filter((f) =>
                selectedFeatures.includes(f.slug)
              )}
              onChange={(_, value) =>
                onFeaturesChange(value.map((f) => f.slug))
              }
              getOptionLabel={(f) => f.name}
              isOptionEqualToValue={(a, b) => a.slug === b.slug}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => {
                  const { key, ...rest } = getTagProps({ index })
                  return (
                    <Chip
                      key={key}
                      size="small"
                      label={option.name}
                      {...rest}
                    />
                  )
                })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder={
                    selectedFeatures.length === 0
                      ? t(
                          'discounts.filters.featuresPlaceholder',
                          'Any feature'
                        )
                      : ''
                  }
                />
              )}
              className="discountFilters__autocomplete"
            />
          </Tooltip>
        </div>

        <div className="discountFilters__field">
          <label className="discountFilters__label">
            {t('discounts.filters.os', 'Operating system')}
          </label>
          <div
            className="discountFilters__segmented"
            role="group"
            aria-label={t('discounts.filters.os', 'Operating system')}
          >
            {OS_OPTIONS.map((os) => {
              const active = selectedOS.includes(os)
              return (
                <button
                  key={os}
                  type="button"
                  className={`discountFilters__segment${
                    active ? ' discountFilters__segment--active' : ''
                  }`}
                  aria-pressed={active}
                  onClick={() => toggleOS(os)}
                >
                  {t(`discounts.os.${os}`, OS_LABEL_FALLBACK[os])}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="discountFilters__row discountFilters__row--sliders">
        <div className="discountFilters__field discountFilters__field--slider">
          <label className="discountFilters__label">
            <span>{t('discounts.filters.price', 'Price')}</span>
            <span className="discountFilters__labelValue">
              {currencyCode} {priceRange[0].toFixed(0)} –{' '}
              {priceRange[1].toFixed(0)}
            </span>
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
          <div className="discountFilters__sliderBounds">
            <span>
              {currencyCode} 0
            </span>
            <span>
              {currencyCode} {priceMax}
            </span>
          </div>
        </div>

        <div className="discountFilters__field discountFilters__field--slider">
          <label className="discountFilters__label">
            <span>{t('discounts.filters.rating', 'Rating')}</span>
            <span className="discountFilters__labelValue">
              {ratingRange[0].toFixed(1)} – {ratingRange[1].toFixed(1)}
            </span>
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
          <div className="discountFilters__sliderBounds">
            <span>0.0</span>
            <span>{RATING_SCALE_MAX.toFixed(1)}</span>
          </div>
        </div>
      </div>
        </div>
      </div>
    </section>
  )
}

export default DiscountFilters
