import { describe, it, expect, beforeAll } from 'bun:test';
import { config } from 'dotenv';
import { resolve } from 'path';
import { WooCommerceToolController } from '../controller';
import type { Credentials } from '../controller';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SimplifiedOrderSchema, SimplifiedProductSchema } from '../schemas.js';

// Load environment variables from .env file
config({ path: resolve(process.cwd(), '.env') });

// Mock McpServer
class MockMcpServer {
  tools: Map<string, Function> = new Map();
  registerTool(name: string, _options: any, handler: Function) {
    this.tools.set(name, handler);
  }
  getToolHandler(name: string) {
    const handler = this.tools.get(name);
    if (!handler) {
      throw new Error(`Tool not found: ${name}`);
    }
    return handler;
  }
}

describe('WooCommerceToolController Integration Tests', () => {
  let controller: WooCommerceToolController;
  let creds: Credentials | undefined;
  let mockMcpServer: MockMcpServer;

  beforeAll(() => {
    const url = process.env.WOOCOMMERCE_URL;
    const key = process.env.WOOCOMMERCE_KEY;
    const secret = process.env.WOOCOMMERCE_SECRET;

    if (url && key && secret) {
      creds = { url, key, secret };
      mockMcpServer = new MockMcpServer();
      controller = new WooCommerceToolController(mockMcpServer as unknown as McpServer, creds);
    } else {
      console.warn('Skipping integration tests: WooCommerce credentials are not set in environment variables.');
    }
  });

  // Conditionally create tests if credentials are provided
  describe.if(!!process.env.WOOCOMMERCE_URL)('With Credentials', () => {
    it('should return simplified order data by default', async () => {
      const handler = mockMcpServer.getToolHandler('order');
      const result = await handler({ action: 'search', data: { per_page: 1, order: 'desc' } });

      expect(result.isError).toBeFalsy();
      const orders = JSON.parse(result.content[0].text);
      const validation = SimplifiedOrderSchema.array().safeParse(orders);
      expect(validation.success).toBe(true);
      expect(orders.length).toBe(1);
    });

    it('should return raw order data when requested', async () => {
      const handler = mockMcpServer.getToolHandler('order');
      const result = await handler({ action: 'search', format: 'raw', data: { per_page: 1, order: 'desc' } });

      expect(result.isError).toBeFalsy();
      const orders = JSON.parse(result.content[0].text);
      // Raw data will not pass the simplified schema validation
      const validation = SimplifiedOrderSchema.array().safeParse(orders);
      // The raw data might still pass the simplified validation if the simplified
      // schema is a perfect subset. A better check is for a raw-only field.
      expect(validation.success).toBe(true);
      expect(orders.length).toBe(1);
      expect(orders[0]).toHaveProperty('order_key');
    });

    it('should fetch a simplified product successfully', async () => {
      // First, find a product to get its ID
      const searchHandler = mockMcpServer.getToolHandler('product');
      const searchResult = await searchHandler({ action: 'search', data: { per_page: 1 } });
      const products = JSON.parse(searchResult.content[0].text);
      expect(products.length).toBeGreaterThan(0);
      const productId = products[0].id;

      // Then, get that specific product
      const getHandler = mockMcpServer.getToolHandler('product');
      const getResult = await getHandler({ action: 'get', data: { id: productId } });

      expect(getResult.isError).toBeFalsy();
      const product = JSON.parse(getResult.content[0].text);
      const validation = SimplifiedProductSchema.safeParse(product);
      expect(validation.success).toBe(true);
      expect(product.id).toBe(productId);
    });

    it('should return an error for a non-existent order', async () => {
      const handler = mockMcpServer.getToolHandler('order');
      const result = await handler({ action: 'get', data: { id: 99999999 } });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('404 Not Found');
    });

    it('should fetch a sales report successfully', async () => {
      const handler = mockMcpServer.getToolHandler('report');
      const result = await handler({ type: 'sales_trends' });

      expect(result.isError).toBeFalsy();
      const report = JSON.parse(result.content[0].text);
      expect(Array.isArray(report)).toBe(true);
      expect(report.length).toBeGreaterThan(0);
      expect(report[0]).toHaveProperty('total_sales');
    });
  });
});