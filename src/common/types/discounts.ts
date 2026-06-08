interface CatalogPrice {
  final: string
  base: string
  discount: string
  finalMoney?: { amount: string; currency: string }
  baseMoney?: { amount: string; currency: string }
}

export interface CatalogGenre {
  name: string
  slug: string
}

export interface CatalogFeature {
  name: string
  slug: string
}

export interface CatalogRating {
  name: string
  ageRating: string
}

export interface CatalogProduct {
  id: string
  title: string
  coverHorizontal?: string
  coverVertical?: string
  price: CatalogPrice
  productType: string
  storeLink: string
  releaseDate?: string
  developers?: string[]
  publishers?: string[]
  operatingSystems?: string[]
  genres?: CatalogGenre[]
  features?: CatalogFeature[]
  reviewsRating?: number
  ratings?: CatalogRating[]
}

export interface CatalogLocaleSettings {
  countryCode: string
  locale: string
  currencyCode: string
}
