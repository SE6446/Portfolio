import { serveDir } from "@std/http/";
import { blogDelete, blogHandler, blogSave } from "./blog/serveblog.ts";
import { githubHandler, huggingfaceGetModelCard, huggingfaceHandler, privateProjectHandler, receivePrivateProject, spacesHandler } from "./projects/projects.ts";
import { healthCheck } from "./api/api.ts";
export async function handler(req: Request): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/blog")) {
        if (req.method === "POST") {
            return await blogSave(req);
        }
        else if (req.method === "GET") {
            return blogHandler(url.searchParams);
        } else if (req.method === "OPTIONS") {
            return new Response(null, {
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization",
                },
            });
        } else if (req.method === "DELETE") {
            return await blogDelete(req);
        }
    }
  
  if (url.pathname.startsWith("/health")) {
    return healthCheck();
  }
  if (url.pathname.startsWith("/aboutme")) {
    return Deno.readTextFile("./static/aboutme.html").then((html) =>
      new Response(html, {
        headers: { "Content-Type": "text/html" },
      })
    );
  }
  if (url.pathname.startsWith("/models")) {
    return await huggingfaceGetModelCard(url.pathname.replace("/models/", ""));
  }
  if (url.pathname.startsWith("/addProject") && req.method === "POST") {
    return await receivePrivateProject(req);
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

function mainPageHandler(): Response {
  let html = Deno.readTextFileSync("./static/index.html");
  //html = await githubHandler(html);
  //html = await spacesHandler(html);
  //console.log(updatedHtml)
  //html = await huggingfaceHandler(html);
  html = privateProjectHandler(html);
  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
}

Deno.serve(handler);
