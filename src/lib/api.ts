const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface RequestOptions {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
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
            throw new Error(error.message || 'Request failed');
        }

        return response.json();
    }

    // Auth
    async login(email: string, password: string) {
        const data = await this.request<{ user: any; token: string }>('/auth/login', {
            method: 'POST',
            body: { email, password },
        });
        this.setToken(data.token);
        return data;
    }

    async register(email: string, password: string, name: string) {
        const data = await this.request<{ user: any; token: string }>('/auth/register', {
            method: 'POST',
            body: { email, password, name },
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
    async getProducts(params: { limit?: number; page?: number; category?: string; search?: string; sort?: string } = {}) {
        // Build query manually to ensure proper URL encoding
        const queryParts: string[] = [];
        if (params.limit !== undefined) queryParts.push(`limit=${params.limit}`);
        if (params.page !== undefined) queryParts.push(`page=${params.page}`);
        if (params.category) queryParts.push(`category=${encodeURIComponent(params.category)}`);
        if (params.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
        if (params.sort) queryParts.push(`sort=${params.sort}`);
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
        return this.request<{ items: any[]; total: number; itemCount: number }>('/cart');
    }

    async addToCart(productId: string, quantity: number) {
        return this.request<any>('/cart/items', {
            method: 'POST',
            body: { productId, quantity },
        });
    }

    async updateCartItem(productId: string, quantity: number) {
        return this.request<any>(`/cart/items/${productId}`, {
            method: 'PATCH',
            body: { quantity },
        });
    }

    async removeFromCart(productId: string) {
        return this.request<any>(`/cart/items/${productId}`, { method: 'DELETE' });
    }

    // Orders
    async createOrder(shippingAddress: any, notes?: string) {
        return this.request<any>('/orders', {
            method: 'POST',
            body: { shippingAddress, notes },
        });
    }

    async getOrders() {
        return this.request<{ orders: any[]; total: number }>('/orders');
    }

    async getOrder(id: string) {
        return this.request<any>(`/orders/${id}`);
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
