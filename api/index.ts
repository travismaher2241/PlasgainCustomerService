import { app } from "../dist/server.js";

export default function handler(req: any, res: any) {
  if (req.body && typeof req.body === "object") {
    req._body = true;
  }
  if (req.url && !req.url.startsWith("/api")) {
    req.url = `/api${req.url.startsWith("/") ? "" : "/"}${req.url}`;
  }
  return app(req, res);
}
