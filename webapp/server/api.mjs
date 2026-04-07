import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";

const FILE_PATH = process.env.FILE_PATH || "/data/file.md";
const PORT = 3001;

const server = createServer(async (req, res) => {
  if (req.url === "/api/file") {
    if (req.method === "GET") {
      try {
        const content = await readFile(FILE_PATH, "utf-8");
        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        res.end(content);
      } catch (err) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("File not found");
      }
      return;
    }

    if (req.method === "PUT") {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const body = Buffer.concat(chunks).toString("utf-8");
      try {
        await writeFile(FILE_PATH, body, "utf-8");
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("OK");
      } catch (err) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Write failed");
      }
      return;
    }
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`API server listening on port ${PORT}`);
});
