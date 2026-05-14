import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import http from "http";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_KEY || "" });
console.log("API Key loaded:", process.env.ANTHROPIC_KEY ? "YES" : "NO - KEY MISSING");

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
  if (req.method !== "POST") { res.writeHead(404); res.end(); return; }

  let body = "";
  req.on("data", chunk => body += chunk);
  req.on("end", async () => {
    try {
      const payload = JSON.parse(body);
      console.log("Calling Anthropic API...");
      const response = await client.messages.create({
        model: payload.model,
        max_tokens: payload.max_tokens,
        system: payload.system,
        messages: payload.messages,
      });
      console.log("Got response!");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(response));
    } catch (err) {
      console.log("ERROR:", err.message);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`HVAC API server running on port ${PORT}`));