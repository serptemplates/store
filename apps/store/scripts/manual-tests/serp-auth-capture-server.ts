#!/usr/bin/env npx tsx

import http from "node:http";

const port = Number(process.env.SERP_AUTH_CAPTURE_PORT ?? 9999);

const server = http.createServer((req, res) => {
  const chunks: Buffer[] = [];
  req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
  req.on("end", () => {
    const body = Buffer.concat(chunks).toString("utf8");

    // Minimal, copy/paste-friendly output
    // eslint-disable-next-line no-console
    console.log(`${req.method ?? "GET"} ${req.url ?? "/"}`);
    // eslint-disable-next-line no-console
    console.log(body || "<empty body>");

    res.statusCode = 200;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: true }));
  });
});

server.listen(port, "127.0.0.1", () => {
  // eslint-disable-next-line no-console
  console.log(`SERP Auth capture server listening on http://127.0.0.1:${port}`);
});

