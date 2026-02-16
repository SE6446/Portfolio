import { assertEquals } from "@std/assert/";
import { handler } from "./main.ts";

Deno.test("handler - GET /blog", async () => {
  const req = new Request("http://localhost/blog?id=1");
  const response = await handler(req);
  assertEquals(response.status, 200);
});

Deno.test("handler - GET /health", async () => {
  const req = new Request("http://localhost/health");
  const response = await handler(req);
  assertEquals(response.status, 200);
});

Deno.test("handler - GET /models/:id", async () => {
  const req = new Request("http://localhost/models/gpt2");
  const response = await handler(req);
  assertEquals(response.status, 200);
});

Deno.test("handler - GET /", async () => {
  const req = new Request("http://localhost/");
  const response = await handler(req);
  assertEquals(response.status, 200);
});

Deno.test("handler - GET /index.html", async () => {
  const req = new Request("http://localhost/index.html");
  const response = await handler(req);
  assertEquals(response.status, 200);
});
