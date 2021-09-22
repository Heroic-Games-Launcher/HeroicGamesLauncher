/**
 * @file  Type definitions for Epic Store's promotion API
 */

interface KeyImage {
    type: string;
    url: string;
}

interface Seller {
    id: string;
    name: string;
}

interface Item {
    id: string;
    namespace: string;
}

interface CustomAttribute {
    key: string;
    value: string;
}

interface Category {
    path: string;
}

interface Tag {
    id: string;
}

interface Mapping {
    pageSlug: string;
    pageType: string;
}

interface CatalogNs {
    mappings: Mapping[];
}

interface CurrencyInfo {
    decimals: number;
}

interface FmtPrice {
    originalPrice: string;
    discountPrice: string;
    intermediatePrice: string;
}

interface TotalPrice {
    discountPrice: number;
    originalPrice: number;
    voucherDiscount: number;
    discount: number;
    currencyCode: string;
    currencyInfo: CurrencyInfo;
    fmtPrice: FmtPrice;
}

interface DiscountSetting {
    discountType: string;
}

interface AppliedRule {
    id: string;
    endDate: Date | string;
    discountSetting: DiscountSetting;
}

interface LineOffer {
    appliedRules: AppliedRule[];
}

interface Price {
    totalPrice: TotalPrice;
    lineOffers: LineOffer[];
}

interface DiscountSetting2 {
    discountType: string;
    discountPercentage: number;
}

interface PromotionalOffer2 {
    startDate: Date | string;
    endDate: Date | string;
    discountSetting: DiscountSetting2;
}

interface PromotionalOffer {
    promotionalOffers: PromotionalOffer2[];
}

interface DiscountSetting3 {
    discountType: string;
    discountPercentage: number;
}

interface PromotionalOffer3 {
    startDate: Date | string;
    endDate: Date | string;
    discountSetting: DiscountSetting3;
}

interface UpcomingPromotionalOffer {
    promotionalOffers: PromotionalOffer3[];
}

interface Promotions {
    promotionalOffers: PromotionalOffer[];
    upcomingPromotionalOffers: UpcomingPromotionalOffer[];
}

export interface Element {
    title: string;
    id: string;
    namespace: string;
    description: string;
    effectiveDate: Date | string;
    offerType: string;
    expiryDate?: string | null;
    status: string;
    isCodeRedemptionOnly: boolean;
    keyImages: KeyImage[];
    seller: Seller;
    productSlug: string;
    urlSlug: string;
    url?: string | null;
    items: Item[];
    customAttributes: CustomAttribute[];
    categories: Category[];
    tags: Tag[];
    catalogNs: CatalogNs;
    offerMappings: never[];
    price: Price;
    promotions: Promotions | null;
}

export interface RootObject {
    elements: Element[];
}
