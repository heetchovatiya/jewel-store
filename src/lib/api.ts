const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface RequestOptions {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
}

export class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

class ApiClient {
    private tenantId: string = 'default';
    private token: string | null = null;

    setTenant(tenantId: string) {
        this.tenantId = tenantId;
    }

    setToken(token: string | null) {
        this.token = token;
        if (token && typeof window !== 'undefined') {
            localStorage.setItem('token', token);
        } else if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
        }
    }

    getToken(): string | null {
        if (this.token) return this.token;
        if (typeof window !== 'undefined') {
            return localStorage.getItem('token');
        }
        return null;
    }

    private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
        const { method = 'GET', body, headers = {} } = options;

        const requestHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            'x-tenant-id': this.tenantId,
            ...headers,
        };

        const token = this.getToken();
        if (token) {
            requestHeaders['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE}${endpoint}`, {
            method,
            headers: requestHeaders,
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Request failed' }));
            throw new ApiError(error.message || 'Request failed', response.status);
        }

        return response.json();
    }

    // Auth
    async login(identifier: string, password: string) {
        const data = await this.request<{ user: any; token: string }>('/auth/login', {
            method: 'POST',
            body: { identifier, password },
        });
        this.setToken(data.token);
        return data;
    }

    async register(email: string, password: string, name: string, phone: string) {
        const data = await this.request<{ user: any; token: string }>('/auth/register', {
            method: 'POST',
            body: { email, password, name, phone },
        });
        this.setToken(data.token);
        return data;
    }

    logout() {
        this.setToken(null);
    }

    // Config
    async getConfig() {
        return this.request<any>('/config');
    }

    async updateConfig(data: any) {
        return this.request<any>('/admin/config', { method: 'PATCH', body: data });
    }

    // Products - use query params for filtering and sorting
    async getProducts(params: { limit?: number; page?: number; category?: string; search?: string; sort?: string; featured?: boolean } = {}) {
        // Build query manually to ensure proper URL encoding
        const queryParts: string[] = [];
        if (params.limit !== undefined) queryParts.push(`limit=${params.limit}`);
        if (params.page !== undefined) queryParts.push(`page=${params.page}`);
        if (params.category) queryParts.push(`category=${encodeURIComponent(params.category)}`);
        if (params.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
        if (params.sort) queryParts.push(`sort=${params.sort}`);
        if (params.featured !== undefined) queryParts.push(`featured=${params.featured}`);
        const query = queryParts.join('&');
        return this.request<{ products: any[]; total: number }>(`/products${query ? '?' + query : ''}`);
    }

    async getProduct(slug: string) {
        return this.request<any>(`/products/${slug}`);
    }

    async getCategories() {
        return this.request<string[]>('/products/categories');
    }

    // Cart
    async getCart() {
        return this.request<import('@/types/commerce').CartResponse>('/cart');
    }

    async addToCart(productId: string, quantity: number, variantId?: string) {
        return this.request<import('@/types/commerce').CartResponse>('/cart/items', {
            method: 'POST',
            body: { productId, quantity, ...(variantId ? { variantId } : {}) },
        });
    }

    /** Price a browser-held guest cart (no login needed, nothing saved). */
    async previewGuestCart(items: import('@/types/commerce').GuestCartLine[]) {
        return this.request<import('@/types/commerce').CartResponse>('/cart/preview', {
            method: 'POST',
            body: { items },
        });
    }

    /** Merge the guest cart into the logged-in user's cart. */
    async mergeGuestCart(items: import('@/types/commerce').GuestCartLine[]) {
        return this.request<import('@/types/commerce').CartResponse>('/cart/merge', {
            method: 'POST',
            body: { items },
        });
    }

    async updateCartItem(lineId: string, quantity: number) {
        return this.request<import('@/types/commerce').CartResponse>(`/cart/items/line/${lineId}`, {
            method: 'PATCH',
            body: { quantity },
        });
    }

    async removeFromCart(lineId: string) {
        return this.request<import('@/types/commerce').CartResponse>(
            `/cart/items/line/${lineId}`,
            { method: 'DELETE' },
        );
    }

    // Orders
    async createOrder(shippingAddress: any, notes?: string) {
        return this.request<any>('/orders', {
            method: 'POST',
            body: { shippingAddress, notes },
        });
    }

    async initiatePayment(shippingAddress: any): Promise<{
        orderId: string;
        razorpayOrderId: string;
        amount: number;
        keyId: string;
        orderNumber: string;
    }> {
        return this.request('/payments/initiate', {
            method: 'POST',
            body: { shippingAddress },
        });
    }

    async verifyPayment(payload: {
        razorpayOrderId: string;
        razorpayPaymentId: string;
        razorpaySignature: string;
    }): Promise<{ orderId: string; status: string }> {
        return this.request('/payments/verify', {
            method: 'POST',
            body: payload,
        });
    }

    async placeCodOrder(shippingAddress: any): Promise<{
        orderId: string;
        orderNumber: string;
        status: string;
    }> {
        return this.request('/payments/cod', {
            method: 'POST',
            body: { shippingAddress },
        });
    }

    async pollOrderStatus(orderId: string): Promise<{ status: string }> {
        return this.request(`/orders/${orderId}`);
    }

    async getOrders() {
        return this.request<{ orders: any[]; total: number }>('/orders');
    }

    async getOrder(id: string) {
        return this.request<any>(`/orders/${id}`);
    }

    // Shipping (Blue Dart)
    async checkServiceability(pincode: string) {
        return this.request<import('@/types/commerce').PincodeServiceability>(
            `/shipping/serviceability?pincode=${encodeURIComponent(pincode)}`,
        );
    }

    async getOrderTracking(orderId: string) {
        return this.request<import('@/types/commerce').OrderTrackingResponse>(`/shipping/orders/${orderId}/tracking`);
    }

    async getShippingStatus() {
        return this.request<{ carrier: string; mock: boolean; serviceability: boolean; waybill: boolean; tracking: boolean }>(
            '/admin/shipping/status',
        );
    }

    async createWaybill(orderId: string, body: { weightKg?: number; pieces?: number; pickupDate?: string; registerPickup?: boolean }) {
        return this.request<any>(`/admin/shipping/orders/${orderId}/waybill`, { method: 'POST', body });
    }

    async cancelWaybill(orderId: string) {
        return this.request<any>(`/admin/shipping/orders/${orderId}/waybill/cancel`, { method: 'POST' });
    }

    async getAdminOrderTracking(orderId: string) {
        return this.request<import('@/types/commerce').OrderTrackingResponse>(`/admin/shipping/orders/${orderId}/tracking`);
    }

    /** Downloads the Blue Dart label PDF (needs the auth header, so not a plain link). */
    async downloadShippingLabel(orderId: string): Promise<{ blob: Blob; filename: string }> {
        const token = this.getToken();
        const response = await fetch(`${API_BASE}/admin/shipping/orders/${orderId}/label`, {
            headers: {
                'x-tenant-id': this.tenantId,
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Label not available' }));
            throw new ApiError(error.message || 'Label not available', response.status);
        }
        const disposition = response.headers.get('content-disposition') || '';
        const filename = /filename="?([^"]+)"?/.exec(disposition)?.[1] || `label-${orderId}.pdf`;
        return { blob: await response.blob(), filename };
    }

    // User
    async getProfile() {
        return this.request<any>('/users/profile');
    }

    async updateProfile(data: any) {
        return this.request<any>('/users/profile', { method: 'PATCH', body: data });
    }

    async addAddress(address: any) {
        return this.request<any>('/users/addresses', { method: 'POST', body: address });
    }

    // Leads
    async submitLead(data: { customerName: string; customerPhone: string; productId?: string }) {
        return this.request<any>('/leads', { method: 'POST', body: data });
    }

    // Admin endpoints
    async getAdminProducts(params: { limit?: number; page?: number; category?: string; search?: string } = {}) {
        const queryParts: string[] = [];
        if (params.limit !== undefined) queryParts.push(`limit=${params.limit}`);
        if (params.page !== undefined) queryParts.push(`page=${params.page}`);
        if (params.category) queryParts.push(`category=${encodeURIComponent(params.category)}`);
        if (params.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
        const query = queryParts.join('&');
        return this.request<{ products: any[]; total: number }>(`/admin/products${query ? '?' + query : ''}`);
    }

    async createProduct(data: any) {
        return this.request<any>('/admin/products', { method: 'POST', body: data });
    }

    async updateProduct(id: string, data: any) {
        return this.request<any>(`/admin/products/${id}`, { method: 'PATCH', body: data });
    }

    async getProductWithInventory(id: string) {
        return this.request<any>(`/admin/products/${id}/with-inventory`);
    }

    async deleteProduct(id: string) {
        return this.request<any>(`/admin/products/${id}`, { method: 'DELETE' });
    }

    async toggleFeatured(id: string) {
        return this.request<any>(`/admin/products/${id}/featured`, { method: 'PATCH' });
    }

    async getAdminOrders(params: { limit?: number; page?: number; status?: string } = {}) {
        const queryParts: string[] = [];
        if (params.limit !== undefined) queryParts.push(`limit=${params.limit}`);
        if (params.page !== undefined) queryParts.push(`page=${params.page}`);
        if (params.status) queryParts.push(`status=${encodeURIComponent(params.status)}`);
        const query = queryParts.join('&');
        return this.request<{ orders: any[]; total: number }>(`/admin/orders${query ? '?' + query : ''}`);
    }

    async updateOrderStatus(id: string, status: string, cancelReason?: string) {
        return this.request<any>(`/admin/orders/${id}/status`, {
            method: 'PATCH',
            body: { status, cancelReason },
        });
    }

    async getOrderStats() {
        return this.request<any>('/admin/orders/stats');
    }

    async getLeads(params: { limit?: number; page?: number; status?: string } = {}) {
        const queryParts: string[] = [];
        if (params.limit !== undefined) queryParts.push(`limit=${params.limit}`);
        if (params.page !== undefined) queryParts.push(`page=${params.page}`);
        if (params.status) queryParts.push(`status=${encodeURIComponent(params.status)}`);
        const query = queryParts.join('&');
        return this.request<{ leads: any[]; total: number }>(`/admin/leads${query ? '?' + query : ''}`);
    }

    async updateLead(id: string, data: any) {
        return this.request<any>(`/admin/leads/${id}`, { method: 'PATCH', body: data });
    }

    // Admin: users & roles
    async getAdminUsers(params: { search?: string; role?: string; page?: number; limit?: number } = {}) {
        const q = new URLSearchParams();
        if (params.search) q.set('search', params.search);
        if (params.role) q.set('role', params.role);
        if (params.page) q.set('page', String(params.page));
        if (params.limit) q.set('limit', String(params.limit));
        const qs = q.toString();
        return this.request<{ users: import('@/types/commerce').AdminUser[]; total: number; page: number; limit: number }>(
            `/admin/users${qs ? `?${qs}` : ''}`,
        );
    }

    async updateUserRole(userId: string, role: import('@/types/commerce').UserRole) {
        return this.request<import('@/types/commerce').AdminUser>(`/admin/users/${userId}/role`, {
            method: 'PATCH',
            body: { role },
        });
    }

    async getInventory() {
        return this.request<any[]>('/admin/inventory');
    }

    async getLowStock() {
        return this.request<any[]>('/admin/inventory/low-stock');
    }

    async updateInventory(productId: string, data: any) {
        return this.request<any>(`/admin/inventory/${productId}`, { method: 'PATCH', body: data });
    }

    async getCustomers() {
        return this.request<any[]>('/admin/customers');
    }

    async bulkUploadProducts(file: File) {
        const formData = new FormData();
        formData.append('file', file);

        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const tenantId = typeof window !== 'undefined' ? localStorage.getItem('tenantId') || 'default' : 'default';

        const response = await fetch(`${API_BASE}/admin/products/bulk`, {
            method: 'POST',
            headers: {
                'x-tenant-id': tenantId,
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Bulk upload failed');
        }

        return response.json();
    }
}

export const api = new ApiClient();
export default api;
