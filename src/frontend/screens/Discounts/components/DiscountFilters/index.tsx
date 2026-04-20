import { useTranslation } from 'react-i18next'
import {
  Autocomplete,
  Chip,
  MenuItem,
  Select,
  Slider,
  TextField
} from '@mui/material'
import type { CatalogGenre } from 'common/types/discounts'
import type { DiscountSort } from '../../helpers'
import './index.css'

interface Props {
  sortBy: DiscountSort
  onSortChange: (sort: DiscountSort) => void
  priceMax: number
  priceRange: [number, number]
  onPriceChange: (range: [number, number]) => void
  currencyCode: string
  genreOptions: CatalogGenre[]
  selectedGenres: string[]
  onGenresChange: (slugs: string[]) => void
  onReset: () => void
  hasActiveFilters: boolean
}

const DiscountFilters = ({
  sortBy,
  onSortChange,
  priceMax,
  priceRange,
  onPriceChange,
  currencyCode,
  genreOptions,
  selectedGenres,
  onGenresChange,
  onReset,
  hasActiveFilters
}: Props) => {
  const { t } = useTranslation()

  return (
    <div className="discountFilters">
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

      <div className="discountFilters__field discountFilters__field--price">
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

      <div className="discountFilters__field discountFilters__field--genres">
        <label className="discountFilters__label">
          {t('discounts.filters.genres', 'Genres')}
        </label>
        <Autocomplete
          multiple
          size="small"
          options={genreOptions}
          value={genreOptions.filter((g) => selectedGenres.includes(g.slug))}
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
