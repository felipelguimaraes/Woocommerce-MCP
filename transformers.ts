import {
  SimplifiedCustomerSchema,
  SimplifiedOrderSchema,
  SimplifiedProductSchema
} from './schemas.js';
import type {
  SimplifiedCustomer,
  SimplifiedOrder,
  SimplifiedProduct
} from './schemas.js';

// Transformer for a single customer
export function transformCustomer(customer: any): SimplifiedCustomer {
  const result = SimplifiedCustomerSchema.safeParse({
    id: customer.id,
    email: customer.email,
    first_name: customer.first_name,
    last_name: customer.last_name,
    role: customer.role,
    username: customer.username,
    billing: customer.billing,
  });

  if (!result.success) {
    throw new Error(`Failed to transform customer data: ${result.error.message}`);
  }
  return result.data;
}

// Transformer for a single order
export function transformOrder(order: any): SimplifiedOrder {
  const result = SimplifiedOrderSchema.safeParse({
    id: order.id,
    status: order.status,
    date_created: order.date_created,
    total: order.total,
    customer_id: order.customer_id,
    billing: order.billing,
    line_items: order.line_items.map((item: any) => ({
      id: item.id,
      name: item.name,
      product_id: item.product_id,
      quantity: item.quantity,
      total: item.total,
    })),
  });

  if (!result.success) {
    throw new Error(`Failed to transform order data: ${result.error.message}`);
  }
  return result.data;
}

// Transformer for a single product
export function transformProduct(product: any): SimplifiedProduct {
  const result = SimplifiedProductSchema.safeParse({
    id: product.id,
    name: product.name,
    sku: product.sku,
    price: product.price,
    stock_quantity: product.stock_quantity,
    stock_status: product.stock_status,
  });

  if (!result.success) {
    throw new Error(`Failed to transform product data: ${result.error.message}`);
  }
  return result.data;
}

// Transformer for an array of any type
export function transformArray<T, U>(items: T[], transformer: (item: T) => U): U[] {
  return items.map(transformer);
}