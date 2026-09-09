import { app } from "../dist/server.js";

export default function handler(req: any, res: any) {
  if (req.body && typeof req.body === "object") {
    req._body = true;
  }
  if (req.url && !req.url.startsWith("/api")) {
    req.url = `/api${req.url.startsWith("/") ? "" : "/"}${req.url}`;
  }
  return new Promise((resolve, reject) => {
    res.on("finish", resolve);
    res.on("close", resolve);
    try {
      app(req, res);
    } catch (err) {
      reject(err);
    }
  });
}
