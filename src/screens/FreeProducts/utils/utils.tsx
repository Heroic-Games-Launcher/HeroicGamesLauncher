import { RootObject, Element } from './apiResponseType';
import { EPIC_STORE_URL } from 'src/constants';

const discountType = 'PERCENTAGE'

/**
 * Check whether a promotion is valid for display
 * Valid promotions have a discount type of PERCENTAGE
 * and a discountPercentage of 0.
 *
 * Valid promotions also need to have valid start and end dates
 * compared to the current date.
 * @param product Product to examine (returned from api)
 * @returns       true if the product has a free and valid promotion
 */
const validatePromotion = (product: Element): boolean => {
  let isValidPromotion = false
  if (product.promotions) {
    product.promotions.promotionalOffers.forEach(offers => {
      offers.promotionalOffers.forEach(o => {
        if (o.discountSetting.discountType === discountType
            && o.discountSetting.discountPercentage === 0)
        {
          const startDate = new Date(o.startDate)
          const endDate = new Date(o.endDate)
          const now = new Date()
          isValidPromotion = (now > startDate && now < endDate)
          if (isValidPromotion) {
            return
          }
        }
      })
    })
  }
  return isValidPromotion
}

/**
 * Iterates through the API response to find valid promotions
 * @param productData List of products with promotions from the API
 * @returns           List of products with valid free promotions
 */
export const extractValidPromotions = (productData: RootObject): Element[]  => {
  const freeProducts: Element[] = []
  productData.elements.forEach(element => {
    if (validatePromotion(element)) {
      freeProducts.push(element)
    }
  });
  return Array.from(new Set(freeProducts))
}


/**
 * Generates Epic Store page link for product
 * @param product     Product object
 * @param lang        User selected language
 * @returns           Epic Store product page URL
 */
export const generateLink = (product: Element, lang: string): string => {
  return `${EPIC_STORE_URL}/${lang}/p/${product.productSlug}`
}