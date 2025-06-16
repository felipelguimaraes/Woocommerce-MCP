import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { WooCommerceToolController, type Credentials } from "./controller.js";
import { randomUUID } from "node:crypto";

// This is a map to hold sessions in memory.
// Note: In a real-world, multi-instance worker environment,
// you would use a durable object or KV store to manage sessions.
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

export default {
  async fetch(request: Request): Promise<Response> {
    const body = await request.json().catch(() => ({}));
    const sessionId = request.headers.get("mcp-session-id");
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports[sessionId]) {
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(body)) {
      const creds: Credentials = {
        url: request.headers.get("X-WC-URL") || "",
        key: request.headers.get("X-WC-KEY") || "",
        secret: request.headers.get("X-WC-SECRET") || "",
      };

      if (!creds.url || !creds.key || !creds.secret) {
        return new Response("Missing WooCommerce credentials in request headers (X-WC-URL, X-WC-KEY, X-WC-SECRET)", { status: 400 });
      }

      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (newSessionId) => {
          transports[newSessionId] = transport;
        },
      });

      transport.onclose = () => {
        if (transport.sessionId) {
          delete transports[transport.sessionId];
        }
      };

      const server = new McpServer({
        name: "woocommerce-mcp-server-worker",
        version: "1.0.0",
      });

      new WooCommerceToolController(server, creds);
      await server.connect(transport);
    } else {
      return new Response("Invalid request. Missing session ID or not an initialization request.", { status: 400 });
    }

    // Adapt the Worker's Request/Response to what the transport expects.
    // This is a simplified adapter for this specific use case.
    const mockReq = {
      headers: Object.fromEntries(request.headers.entries()),
      body: body,
    };

    let responseBody = "";
    let responseStatus = 200;
    const responseHeaders = new Headers({ 'Content-Type': 'application/json' });

    const mockRes = {
      setHeader: (key: string, value: string) => responseHeaders.set(key, value),
      status: (code: number) => {
        responseStatus = code;
        return {
          json: (data: any) => { responseBody = JSON.stringify(data); },
          send: (data: any) => { responseBody = data; },
        };
      },
      write: (chunk: any) => { responseBody += chunk; },
      end: () => {},
    };

    await transport.handleRequest(mockReq as any, mockRes as any, body);

    return new Response(responseBody, {
      status: responseStatus,
      headers: responseHeaders,
    });
  },
};