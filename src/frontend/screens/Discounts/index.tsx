import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { UpdateComponent } from 'frontend/components/UI'
import type { CatalogProduct } from 'common/types/discounts'
import DiscountCard from './components/DiscountCard'
import { getLocaleSettings } from './helpers'
import './index.css'

export default function Discounts() {
  const { t, i18n } = useTranslation()
  const localeSettings = useMemo(
    () => getLocaleSettings(i18n.language),
    [i18n.language]
  )

  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      setProducts([])

      try {
        const result = await window.api.getGogDiscounts(localeSettings)
        if (!cancelled) setProducts(result)
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

  return (
    <div className="discountsScreen">
      <h2 className="discountsScreen__header">
        {t('discounts.title', 'GOG Discounts')}
        {!loading && products.length > 0 && (
          <span className="discountsScreen__count">
            {t('discounts.count', '{{count}} games on sale', {
              count: products.length
            })}
          </span>
        )}
      </h2>

      {loading && (
        <UpdateComponent
          message={t('discounts.loading', 'Loading discounted games...')}
        />
      )}

      {!loading && error && (
        <p className="discountsScreen__message">{error}</p>
      )}

      {!loading && !error && products.length === 0 && (
        <p className="discountsScreen__message">
          {t('discounts.empty', 'No discounted games available right now.')}
        </p>
      )}

      {!loading && !error && products.length > 0 && (
        <div className="discountsScreen__grid">
          {products.map((product) => (
            <DiscountCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}
