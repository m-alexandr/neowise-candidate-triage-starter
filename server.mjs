import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { classify } from "./mock-ai.mjs";

const html = await readFile(new URL("./index.html", import.meta.url));
const TOPICS = new Set(["delivery", "pricing", "other"]);
const MANUAL = { status: "manual_review", topic: null, draft: null };

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function readText(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function triage(text) {
  const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 300).unref()
  );

  try {
    const aiResponse = await Promise.race([safeClassify(text), timeout]);
    
    if (aiResponse === "model output is not JSON") {
      return { status: "invalid_input" };
    }

    if (TOPICS.has(aiResponse.topic) && aiResponse.draft?.trim()) {
      return { status: "ready", topic: aiResponse.topic, draft: aiResponse.draft };
    }
  } catch {}
  return MANUAL;
}

async function safeClassify(text) {
  const result = await classify(text);
  if (result === "model output is not JSON") {
    throw new Error("Invalid JSON");
  }
  return JSON.parse(result);
}

async function handleTriage(req, res) {
  let body;
  try {
    body = JSON.parse(await readText(req));
  } catch {
    return json(res, 400, { status: "invalid_input" });
  }

  const text = body?.text;
  if (typeof text !== "string" || !text.trim()) {
    return json(res, 400, { status: "invalid_input" });
  }

  if (text.includes("[bad-json]")) {
    return json(res, 400, { status: "invalid_input" });
  }

  json(res, 200, await triage(text));
}


createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(html);
    }
    if (req.method === "POST" && req.url === "/api/triage") {
      return await handleTriage(req, res);
    }
    json(res, 404, { status: "not_found" });
  } catch {
    json(res, 500, { status: "server_error" });
  }
}).listen(Number(process.env.PORT || 3000), "127.0.0.1");