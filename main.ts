import { serveDir } from "@std/http/";
import { blogHandler, blogSave } from "./blog/serveblog.ts";
import { githubHandler } from "./projects/projects.ts";
async function handler(req: Request): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/blog")) {
        if (req.method === "POST") {
            return await blogSave(req);
        }
        else if (req.method === "GET") {
            return blogHandler(url.searchParams);
        }
    }
    if (url.pathname === "/" || url.pathname === "/index.html") {
        return mainPageHandler();
    }
    return serveDir(req, {
        fsRoot: "./static",
        urlRoot: "",
        showDirListing: false,
        enableCors: true,
    });
}

async function mainPageHandler(): Promise<Response> {
    const html = Deno.readTextFileSync("./static/index.html");
    const updatedHtml = await githubHandler(html);
    console.log(updatedHtml)
    return new Response(updatedHtml, {
        headers: { "Content-Type": "text/html" },
    });
}

Deno.serve(handler);
