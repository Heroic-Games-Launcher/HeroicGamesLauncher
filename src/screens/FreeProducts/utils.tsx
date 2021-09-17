import { RootObject, Element } from './apiResponseType';

const discountType = 'PERCENTAGE'

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

export const extractValidPromotions = (productData: RootObject): Element[]  => {
  const freeProducts: Element[] = []
  productData.elements.forEach(element => {
    if (validatePromotion(element)) {
      freeProducts.push(element)
    }
  });
  return Array.from(new Set(freeProducts))
}