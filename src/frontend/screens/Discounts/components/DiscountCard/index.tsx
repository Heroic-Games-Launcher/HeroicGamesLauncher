import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CachedImage } from 'frontend/components/UI'
import fallBackImage from 'frontend/assets/heroic_card.jpg'
import GOGLogo from 'frontend/assets/gog-logo.svg?react'
import GMGLogo from 'frontend/assets/gmg-logo.svg?react'
import HumbleLogo from 'frontend/assets/humble-logo.svg?react'
import type { CatalogProduct } from 'common/types/discounts'
import {
  getAffiliateLink,
  normalizeRating,
  parseDiscountPercent
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
  const store = product.store ?? 'gog'
  const isExternalKey = store === 'gmg' || store === 'humble'
  const drm = isExternalKey ? product.features?.[0]?.name : undefined

  const handleClick = () => {
    const target = getAffiliateLink(product)
    if (isExternalKey) {
      window.api.openExternalUrl(target)
      return
    }
    navigate(`/store-page?store-url=${encodeURIComponent(target)}`)
  }

  const storeBadgeTitle = (): string => {
    if (store === 'gmg') {
      return drm
        ? t(
            'discounts.storeBadge.gmgDrmHint',
            'Green Man Gaming — {{drm}} key, redeemed outside Heroic',
            { drm }
          )
        : t(
            'discounts.storeBadge.gmgHint',
            'Green Man Gaming — key for an external store, not installable through Heroic'
          )
    }
    if (store === 'humble') {
      return drm
        ? t(
            'discounts.storeBadge.humbleDrmHint',
            'Humble Bundle — {{drm}} key, redeemed outside Heroic',
            { drm }
          )
        : t(
            'discounts.storeBadge.humbleHint',
            'Humble Bundle — key for an external store, not installable through Heroic'
          )
    }
    return 'GOG'
  }

  const StoreLogo =
    store === 'gmg' ? GMGLogo : store === 'humble' ? HumbleLogo : GOGLogo

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
      <div className="discountCard__cover">
        <CachedImage
          className="discountCard__image"
          src={cover}
          fallback={fallBackImage}
          alt={product.title}
        />
        <span className="discountCard__storeIcon" title={storeBadgeTitle()}>
          <StoreLogo />
        </span>
      </div>
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
