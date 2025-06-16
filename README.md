# WooCommerce MCP Server

This project provides a Model-Context-Protocol (MCP) server for interacting with the WooCommerce API. It exposes a set of tools that allow AI agents and other applications to easily query and manipulate WooCommerce data like customers, orders, products, and reports.

## Features

- **Customer Management**: Search, get, and edit customer data.
- **Order Management**: Search, get, edit, and create orders.
- **Product Management**: Search, get, and edit products.
- **Reporting**: Generate sales trends and top-seller reports.
- **Flexible Output**: Choose between clean, simplified JSON or the full, raw API response using the `format` parameter.
- **Schema-Driven**: Uses Zod schemas for robust data validation and clear data models.
- **Tested**: Includes an integration test suite to ensure reliability.

## Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    cd woocommerce-mcp-server
    ```

2.  **Install dependencies:**
    ```bash
    bun install
    ```

3.  **Configure credentials:**
    Copy the example environment file:
    ```bash
    cp .env.example .env
    ```
    Then, edit the `.env` file and add your actual WooCommerce API credentials.

## Usage

This server can be run in three modes: as a local stdio-based server, a local HTTP server, or deployed as a serverless Cloudflare Worker.

### Stdio Server (for local development)

This is the simplest way to run the server for local testing and development. It reads credentials from your `.env` file.

```bash
bun run dev
```

### HTTP Server (for local development)

This runs the server as a local HTTP service, allowing it to be accessed over the network.

```bash
bun run start
```

### Deployment (Cloudflare Worker)

This project is designed to be deployed as a multi-tenant, serverless worker on the Cloudflare global network. This is the recommended approach for production use.

1.  **Configure Wrangler:**
    Copy the example configuration file:
    ```bash
    cp wrangler.example.toml wrangler.toml
    ```
    Then, edit `wrangler.toml` and set your desired `name` and optionally a custom `route`.

2.  **Login to Cloudflare:**
    ```bash
    bunx wrangler login
    ```

3.  **Deploy the worker:**
    ```bash
    bunx wrangler deploy
    ```
    After deployment, `wrangler` will provide you with the public URL for your worker.

#### Using a Custom Domain

To use a custom domain for your worker:

1.  Add a `routes` section to your `wrangler.toml` file:
    ```toml
    [[routes]]
    pattern = "your.domain.com/path/*"
    zone_name = "your.domain.com"
    ```
2.  Deploy again with `bunx wrangler deploy`.

## Running Tests

The project includes an integration test suite that runs against a live WooCommerce API.

1.  Make sure your `.env` file is configured correctly.
2.  Run the tests:
    ```bash
    npm test
    ```

## Tool Reference

### `customer`
- **Actions**: `search`, `get`, `edit`
- **Example**: `use_mcp_tool('customer', { action: 'search', data: { email: 'user@example.com' } })`

### `order`
- **Actions**: `search`, `get`, `edit`, `create`
- **Example**: `use_mcp_tool('order', { action: 'search', data: { per_page: 5 }, format: 'simplified' })`

### `product`
- **Actions**: `search`, `get`, `edit`
- **Example**: `use_mcp_tool('product', { action: 'get', data: { id: 123 } })`

### `report`
- **Types**: `sales_trends`, `top_products`, `customers_totals`, `orders_totals`, `products_totals`
- **Example**: `use_mcp_tool('report', { type: 'sales_trends' })`

## Contributing

Contributions are welcome! Please feel free to submit a pull request.
