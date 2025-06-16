import { z } from 'zod';

// Simplified schema for a customer's billing information
const BillingInfoSchema = z.object({
  first_name: z.string(),
  last_name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  address_1: z.string(),
  city: z.string(),
  state: z.string(),
  postcode: z.string(),
  country: z.string(),
});

// Simplified schema for a customer
export const SimplifiedCustomerSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  first_name: z.string(),
  last_name: z.string(),
  role: z.string(),
  username: z.string(),
  billing: BillingInfoSchema,
});

// Simplified schema for a line item within an order
export const SimplifiedLineItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  product_id: z.number(),
  quantity: z.number(),
  total: z.string(),
});

// Simplified schema for an order
export const SimplifiedOrderSchema = z.object({
  id: z.number(),
  status: z.string(),
  date_created: z.string(),
  total: z.string(),
  customer_id: z.number(),
  billing: BillingInfoSchema,
  line_items: z.array(SimplifiedLineItemSchema),
});

// Simplified schema for a product
export const SimplifiedProductSchema = z.object({
  id: z.number(),
  name: z.string(),
  sku: z.string(),
  price: z.string(),
  stock_quantity: z.number().nullable(),
  stock_status: z.string(),
});

// Type definitions inferred from schemas
export type SimplifiedCustomer = z.infer<typeof SimplifiedCustomerSchema>;
export type SimplifiedOrder = z.infer<typeof SimplifiedOrderSchema>;
export type SimplifiedProduct = z.infer<typeof SimplifiedProductSchema>;