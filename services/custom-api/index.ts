import { serve } from "@hono/node-server";
import { Hono } from "hono";
import airbnb from "./routes/airbnb.js";

const app = new Hono();

// Mount route modules under /api/<name>
app.route("/api/airbnb", airbnb);

// Health check
app.get("/health", (c) => c.json({ ok: true }));

// Index — list available route namespaces
app.get("/", (c) =>
  c.json({
    service: "custom-api",
    routes: [
      { path: "/api/airbnb", description: "Airbnb search & listing details" },
    ],
  })
);

const port = Number(process.env.CUSTOM_API_PORT ?? 3002);
console.log(`custom-api listening on :${port}`);
serve({ fetch: app.fetch, port });
