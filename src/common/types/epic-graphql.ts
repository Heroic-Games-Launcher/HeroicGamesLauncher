import { Reqs } from 'common/types'

interface CatalogMapping {
  pageSlug: string
  pageType: string
}

export interface Catalog {
  catalogNs: {
    mappings: CatalogMapping[]
  }
}

export interface Product {
  sandbox: {
    configuration: ProductConfig[]
  }
}

interface ProductConfig {
  configs: {
    shortDescription: string
    technicalRequirements: {
      macos: Reqs[] | null
      windows: Reqs[] | null
    }
  }
}
