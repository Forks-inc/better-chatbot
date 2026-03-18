import { MCPClient } from "./src/lib/ai/mcp/create-mcp-client";
import http from "http";

async function testHeaders() {
  const port = 9999;
  const server = http.createServer((req, res) => {
    console.log("Incoming Headers:", JSON.stringify(req.headers, null, 2));
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "unauthorized" }));
  });

  server.listen(port);

  const client = new MCPClient("test-id", "test-name", {
    url: `http://localhost:${port}/mcp`,
    headers: {
      Authorization: "Bearer d6613b10296bcd9945aa377f2e599bde2",
    },
  });

  try {
    console.log("Connecting to mock server...");
    await client.connect();
  } catch (_e) {
    console.log("Client connection failed as expected");
  } finally {
    server.close();
  }
}

testHeaders();
