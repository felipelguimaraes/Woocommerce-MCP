import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { transformCustomer, transformOrder, transformProduct, transformArray } from './transformers.js';

// --- INTERFACES ---

export interface Credentials {
  url: string;
  key: string;
  secret: string;
}

// --- WOOCOMMERCE API CLIENT ---

class WooCommerceAPI {
  private baseUrl: string;
  private consumerKey: string;
  private consumerSecret: string;
  private initialized: boolean = false;

  constructor(creds?: Credentials) {
    if (creds && creds.url && creds.key && creds.secret) {
      this.baseUrl = creds.url.replace(/\/$/, '');
      this.consumerKey = creds.key;
      this.consumerSecret = creds.secret;
      this.initialized = true;
    } else {
      this.baseUrl = '';
      this.consumerKey = '';
      this.consumerSecret = '';
      this.initialized = false;
    }
  }
  
  private checkInitialized() {
      if (!this.initialized) {
          throw new Error("WooCommerce API credentials are not initialized. Please connect with the required credentials.");
      }
  }

  private async request(endpoint: string, method = 'GET', data?: any): Promise<any> {
    this.checkInitialized();
    const url = `${this.baseUrl}/wp-json/wc/v3/${endpoint}`;
    const auth = btoa(`${this.consumerKey}:${this.consumerSecret}`);
    
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`WooCommerce API error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    return await response.json();
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`${endpoint}${queryString}`);
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    return this.request(endpoint, 'POST', data);
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    return this.request(endpoint, 'PUT', data);
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request(endpoint, 'DELETE');
  }
}

// --- WOOCOMMERCE LOGIC CONTROLLER ---

export class WooCommerceToolController {
  private wc: WooCommerceAPI;

  constructor(private server: McpServer, creds?: Credentials) {
    // Initialize API client with credentials if provided, otherwise it remains uninitialized
    this.wc = new WooCommerceAPI(creds);
    this.registerTools();
  }

  private registerTools() {
    this.server.registerTool('customer', {
      description: 'Search, get, or edit customer data',
      inputSchema: {
        action: z.enum(['search', 'get', 'edit']),
        format: z.enum(['raw', 'simplified']).default('simplified').optional(),
        data: z.object({}).passthrough(),
      }
    }, async (params) => this.handleCustomer(params));

    this.server.registerTool('order', {
      description: 'Get, edit, or create order data',
      inputSchema: {
        action: z.enum(['search', 'get', 'edit', 'create']),
        format: z.enum(['raw', 'simplified']).default('simplified').optional(),
        data: z.object({}).passthrough(),
      }
    }, async (params) => this.handleOrder(params));

    this.server.registerTool('product', {
      description: 'Search, get, or edit product data',
      inputSchema: {
        action: z.enum(['search', 'get', 'edit']),
        format: z.enum(['raw', 'simplified']).default('simplified').optional(),
        data: z.object({}).passthrough(),
      }
    }, async (params) => this.handleProduct(params));
    this.server.registerTool('report', { description: 'Generate custom business reports', inputSchema: { type: z.enum(['sales_trends', 'top_products', 'customers_totals', 'orders_totals', 'products_totals']), filters: z.object({}).passthrough().optional() } }, async (params) => this.handleReport(params));
    this.server.registerTool('feedback', { description: 'Report missing functionality', inputSchema: { request: z.string(), context: z.string().optional() } }, async (params) => this.handleFeedback(params));
  }

  private toToolResult(data: any) {
    return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
  }
  private toErrorResult(message: string) {
    return { isError: true, content: [{ type: 'text' as const, text: message }] };
  }

  private async handleCustomer({ action, data, format }: { action: 'search' | 'get' | 'edit', data: any, format?: 'raw' | 'simplified' }) {
    try {
      const { id, ...updates } = data;
      switch (action) {
        case 'search': {
          const customers = await this.wc.get<any[]>('customers', data);
          return this.toToolResult(format === 'raw' ? customers : transformArray(customers, transformCustomer));
        }
        case 'get': {
          const customer = await this.wc.get<any>(`customers/${id}`);
          return this.toToolResult(format === 'raw' ? customer : transformCustomer(customer));
        }
        case 'edit': {
          const updatedCustomer = await this.wc.put<any>(`customers/${id}`, updates);
          return this.toToolResult(format === 'raw' ? updatedCustomer : transformCustomer(updatedCustomer));
        }
      }
    } catch (e: any) { return this.toErrorResult(`Customer operation failed: ${e.message}`); }
  }
  
  private async handleOrder({ action, data, format }: { action: 'search' | 'get' | 'edit' | 'create', data: any, format?: 'raw' | 'simplified' }) {
    try {
      const { id, ...updates } = data;
      switch (action) {
        case 'search': {
          const orders = await this.wc.get<any[]>('orders', data);
          return this.toToolResult(format === 'raw' ? orders : transformArray(orders, transformOrder));
        }
        case 'get': {
          const order = await this.wc.get<any>(`orders/${id}`);
          return this.toToolResult(format === 'raw' ? order : transformOrder(order));
        }
        case 'edit': {
          const updatedOrder = await this.wc.put<any>(`orders/${id}`, updates);
          return this.toToolResult(format === 'raw' ? updatedOrder : transformOrder(updatedOrder));
        }
        case 'create': {
          const newOrder = await this.wc.post<any>('orders', data);
          return this.toToolResult(format === 'raw' ? newOrder : transformOrder(newOrder));
        }
      }
    } catch (e: any) { return this.toErrorResult(`Order operation failed: ${e.message}`); }
  }

  private async handleProduct({ action, data, format }: { action: 'search' | 'get' | 'edit', data: any, format?: 'raw' | 'simplified' }) {
    try {
      const { id, ...updates } = data;
      switch (action) {
        case 'search': {
          const products = await this.wc.get<any[]>('products', data);
          return this.toToolResult(format === 'raw' ? products : transformArray(products, transformProduct));
        }
        case 'get': {
          const product = await this.wc.get<any>(`products/${id}`);
          return this.toToolResult(format === 'raw' ? product : transformProduct(product));
        }
        case 'edit': {
          const updatedProduct = await this.wc.put<any>(`products/${id}`, updates);
          return this.toToolResult(format === 'raw' ? updatedProduct : transformProduct(updatedProduct));
        }
      }
    } catch (e: any) { return this.toErrorResult(`Product operation failed: ${e.message}`); }
  }

  private async handleReport({ type, filters }: { type: string, filters?: any }) {
    try {
      switch (type) {
        case 'sales_trends': {
          const report = await this.wc.get<any[]>('reports/sales', filters);
          return this.toToolResult(report);
        }
        case 'top_products': {
          const report = await this.wc.get<any[]>('reports/top_sellers', filters);
          return this.toToolResult(report);
        }
        case 'customers_totals': {
          const report = await this.wc.get<any[]>('reports/customers/totals', filters);
          return this.toToolResult(report);
        }
        case 'orders_totals': {
          const report = await this.wc.get<any[]>('reports/orders/totals', filters);
          return this.toToolResult(report);
        }
        case 'products_totals': {
          const report = await this.wc.get<any[]>('reports/products/totals', filters);
          return this.toToolResult(report);
        }
        default:
          return this.toErrorResult(`Invalid report type: ${type}`);
      }
    } catch (e: any) { return this.toErrorResult(`Report generation failed: ${e.message}`); }
  }

  private async handleFeedback({ request, context }: { request: string, context?: string }) {
    console.log("FEEDBACK RECEIVED:", { request, context });
    return this.toToolResult({ status: "Feedback received", request });
  }
}