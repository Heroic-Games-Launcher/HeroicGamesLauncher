import { useTranslation } from 'react-i18next'
import './index.css'

interface Props {
  page: number
  totalPages: number
  onChange: (page: number) => void
}

const buildPageList = (page: number, totalPages: number): (number | '…')[] => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  const pages: (number | '…')[] = [1]
  const start = Math.max(2, page - 1)
  const end = Math.min(totalPages - 1, page + 1)
  if (start > 2) pages.push('…')
  for (let i = start; i <= end; i++) pages.push(i)
  if (end < totalPages - 1) pages.push('…')
  pages.push(totalPages)
  return pages
}

const DiscountPagination = ({ page, totalPages, onChange }: Props) => {
  const { t } = useTranslation()
  if (totalPages <= 1) return null

  const pages = buildPageList(page, totalPages)

  return (
    <nav
      className="discountPagination"
      aria-label={t('discounts.aria.pagination', 'Pagination')}
    >
      <button
        type="button"
        className="discountPagination__btn"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        {t('discounts.pagination.prev', 'Previous')}
      </button>
      <ul className="discountPagination__list">
        {pages.map((p, i) =>
          p === '…' ? (
            <li
              key={`ellipsis-${i}`}
              className="discountPagination__ellipsis"
              aria-hidden="true"
            >
              …
            </li>
          ) : (
            <li key={p}>
              <button
                type="button"
                className={`discountPagination__page${
                  p === page ? ' discountPagination__page--active' : ''
                }`}
                onClick={() => onChange(p)}
                aria-current={p === page ? 'page' : undefined}
              >
                {p}
              </button>
            </li>
          )
        )}
      </ul>
      <button
        type="button"
        className="discountPagination__btn"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        {t('next', 'Next')}
      </button>
    </nav>
  )
}

export default DiscountPagination
