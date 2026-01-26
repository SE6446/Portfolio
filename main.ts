import { serveDir } from "jsr:@std/http/file-server";
import { blogHandler, blogSave } from "./blog/serveblog.ts";
async function handler(req: Request): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/blog")) {
        if (req.method === "POST") {
            return await blogSave(req);
        }
        else if (req.method === "GET") {
            return blogHandler(req, url.searchParams);
        }
    }
    return serveDir(req, {
        fsRoot: "./static",
        urlRoot: "",
    });
}

Deno.serve(handler);
