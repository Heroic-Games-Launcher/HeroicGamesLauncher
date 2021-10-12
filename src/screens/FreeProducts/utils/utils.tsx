import { FreeGameElement } from 'src/types'

/**
 * Generates Epic Store page link for product
 * @param product     Product object
 * @param lang        User selected language
 * @returns           Epic Store product page URL
 */
export const generateLink = (product: FreeGameElement, lang: string): string => {
  const storeUrl = `https://www.epicgames.com/store/${lang}`
  return `${storeUrl}/p/${product.productSlug}`
}