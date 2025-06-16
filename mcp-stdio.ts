#!/usr/bin/env bun

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { WooCommerceToolController } from "./controller.js";
import type { Credentials } from "./controller.js";

async function main() {
  const server = new McpServer({
    name: "woocommerce-mcp-server-stdio",
    version: "1.0.0"
  });

  // For stdio, we fall back to environment variables for convenience
  const creds: Credentials = {
    url: process.env.WC_URL || '',
    key: process.env.WC_CONSUMER_KEY || '',
    secret: process.env.WC_CONSUMER_SECRET || ''
  };
  
  // Register all tools using the controller
  new WooCommerceToolController(server, creds);

  // Connect via Stdio
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("WooCommerce MCP server running on stdio");
}

main().catch(console.error);