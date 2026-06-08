import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CachedImage } from 'frontend/components/UI'
import fallBackImage from 'frontend/assets/heroic_card.jpg'
import type { CatalogProduct } from 'common/types/discounts'
import {
  normalizeRating,
  parseDiscountPercent,
  withAffiliate
} from '../../helpers'
import './index.css'

interface Props {
  product: CatalogProduct
}

const DiscountCard = ({ product }: Props) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const cover =
    product.coverVertical || product.coverHorizontal || fallBackImage
  const discountPercent = parseDiscountPercent(product.price.discount)
  const rating = normalizeRating(product.reviewsRating)

  const handleClick = () => {
    const target = withAffiliate(product.storeLink)
    navigate(`/store-page?store-url=${encodeURIComponent(target)}`)
  }

  return (
    <button
      type="button"
      className="discountCard"
      onClick={handleClick}
      title={product.title}
    >
      {rating > 0 && (
        <span
          className="discountCard__score"
          aria-label={t(
            'discounts.aria.rating',
            'Rating {{rating}} out of 10',
            {
              rating: rating.toFixed(1)
            }
          )}
        >
          <span className="discountCard__scoreStar" aria-hidden="true">
            ★
          </span>
          {rating.toFixed(1)}
        </span>
      )}
      {discountPercent > 0 && (
        <span className="discountCard__badge">-{discountPercent}%</span>
      )}
      <CachedImage
        className="discountCard__image"
        src={cover}
        fallback={fallBackImage}
        alt={product.title}
      />
      <div className="discountCard__info">
        <span className="discountCard__title">{product.title}</span>
        <div className="discountCard__priceRow">
          <span className="discountCard__basePrice">{product.price.base}</span>
          <span className="discountCard__finalPrice">
            {product.price.final}
          </span>
        </div>
      </div>
    </button>
  )
}

export default DiscountCard
