import { FreeGameElement } from 'src/types'

/**
 * Reset the promotion dates for 2 preselected products
 * This is to ensure tests will not break in the future
 * @param elements    List of products with promotions from the Mock API response
 * @returns           No return value as object is altered inline
 */
export const resetDates = (elements: FreeGameElement[]) => {
  const validProducts = ['d89d1ecf209d42688d82909e522f2ec1', '0c7924b21589422581c7cbe8d5a336c5']
  elements.forEach(element => {
    if (element.promotions && validProducts.includes(element.id) ){
      element.promotions.promotionalOffers.forEach(offers => {
        offers.promotionalOffers.forEach(o => {
          if (o.discountSetting.discountType === 'PERCENTAGE'
                    && o.discountSetting.discountPercentage === 0)
          {
            const dateNow = new Date()
            o.endDate = new Date(dateNow.setDate(dateNow.getDate() + 14))
            o.startDate = new Date(dateNow.setDate(dateNow.getDate() - 20))
          }
        })
      })
    }
  })
}
