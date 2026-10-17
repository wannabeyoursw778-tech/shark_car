"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const port = Number(process.env.PORT) || 3000;
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

http.createServer((request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  } catch {
    response.writeHead(400);
    response.end("Noto‘g‘ri so‘rov.");
    return;
  }

  const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
  const filePath = path.resolve(root, relativePath);
  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403);
    response.end("Ruxsat berilmagan.");
    return;
  }

  fs.readFile(filePath, (error, contents) => {
    if (error) {
      if (error.code !== "ENOENT" && error.code !== "ENOTDIR") {
        console.error("Faylni o‘qishda xatolik:", error);
        response.writeHead(500);
        response.end("Serverda ichki xatolik.");
        return;
      }
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Sahifa topilmadi.");
      return;
    }

    response.writeHead(200, {
      "Content-Type": contentTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff"
    });
    response.end(contents);
  });
}).listen(port, "127.0.0.1", () => {
  console.log(`SHARK CAR ishga tushdi: http://127.0.0.1:${port}`);
});
