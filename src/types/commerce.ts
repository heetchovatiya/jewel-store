/** API contracts — keep in sync with shared/types/commerce.ts */

export interface ProductVariant {
    _id: string;
    size?: string;
    color?: string;
    price?: number;
    sku?: string;
    stock?: number;
    image?: string;
    isActive?: boolean;
}

export interface ProductInventorySummary {
    stock?: number;
    sku?: string;
    inStock?: boolean;
    priceFrom?: number;
    priceTo?: number;
    allowBackorder?: boolean;
}

export interface Product {
    _id: string;
    title: string;
    description?: string;
    price: number;
    compareAtPrice?: number;
    category: string;
    images: string[];
    videos?: string[];
    hoverImageIndex?: number | null;
    slug: string;
    isActive?: boolean;
    isFeatured?: boolean;
    specifications?: Record<string, string>;
    hasVariants?: boolean;
    variants?: ProductVariant[];
    availableSizes?: string[];
    availableColors?: string[];
    colorImages?: Record<string, string[]>;
    inventory?: ProductInventorySummary;
}

export interface CartItem {
    lineId: string;
    productId: string;
    variantId?: string;
    size?: string;
    color?: string;
    title: string;
    price: number;
    image: string;
    quantity: number;
    sku?: string;
}

export interface CartResponse {
    items: CartItem[];
    total: number;
    itemCount: number;
    /** Lines that were dropped or reduced (guest-cart preview / merge). */
    issues?: CartIssue[];
}

/** A guest-cart line that could not be kept as-is. */
export interface CartIssue {
    productId: string;
    variantId?: string;
    title?: string;
    message: string;
}

/** Minimal line stored in the browser for logged-out shoppers. */
export interface GuestCartLine {
    productId: string;
    variantId?: string;
    quantity: number;
}

export interface OrderItem {
    productId: string;
    variantId?: string;
    size?: string;
    color?: string;
    title: string;
    price: number;
    image?: string;
    quantity: number;
    sku?: string;
}

/** GET /shipping/serviceability?pincode= */
export interface PincodeServiceability {
    pincode: string;
    /** false = Blue Dart could not be reached; orders are still allowed. */
    checked: boolean;
    serviceable: boolean;
    prepaidAvailable: boolean;
    codAvailable: boolean;
    estimatedDeliveryDate?: string;
    message?: string;
}

export interface TrackingScan {
    scan: string;
    scanCode?: string;
    scanType?: string;
    date?: string;
    time?: string;
    location?: string;
}

export interface OrderTrackingResponse {
    orderNumber: string;
    shipment: { carrier: string; awbNo: string; trackingUrl: string } | null;
    tracking: {
        awbNo: string;
        found: boolean;
        status?: string;
        statusType?: string;
        statusDate?: string;
        statusTime?: string;
        expectedDeliveryDate?: string;
        origin?: string;
        destination?: string;
        receivedBy?: string;
        scans: TrackingScan[];
        fetchedAt: string;
    } | null;
    message?: string;
}

export interface OrderShipment {
    carrier: string;
    awbNo: string;
    status: 'created' | 'cancelled' | string;
    destinationArea?: string;
    destinationLocation?: string;
    weightKg?: number;
    pieces?: number;
    pickupDate?: string;
    pickupRegistered?: boolean;
    hasLabel?: boolean;
    createdAt?: string;
    lastStatus?: string;
    expectedDeliveryDate?: string;
}

export type UserRole = 'customer' | 'admin' | 'super_admin';

/** Row in the admin "Users & roles" page. */
export interface AdminUser {
    _id: string;
    email: string;
    name: string;
    phone?: string;
    role: UserRole;
    createdAt?: string;
    roleChangedAt?: string;
}
