export function blogHandler(req: Request, uri:URLSearchParams) {
    if (uri.has("post")) {
        let htmlTemplate = Deno.readTextFileSync("./blog/static/template.html");
        const postId = uri.get("post");
        const htmlContent = Deno.readTextFileSync(`./blog/html/${postId}.html`);
        console.log(`Serving blog post: ${postId}`);
        console.log(htmlContent);
        htmlTemplate = htmlTemplate.replace("{{title}}", postId || "Blog");        
        htmlTemplate = htmlTemplate.replace("{{content}}", htmlContent);
        console.log(htmlTemplate);
        return new Response(htmlTemplate, {
            headers: { "Content-Type": "text/html" },
            
        });
    }
    else {
        let htmlIndex = Deno.readTextFileSync("./blog/static/index.html");
        htmlIndex = htmlIndex.replace("{{content}}", listBlogPosts());
        return new Response(htmlIndex, {
            headers: { "Content-Type": "text/html" },
        });
    }
}

function listBlogPosts() {
    const files = Deno.readDirSync("./blog/html");
    let content = "";
    for (const file of files) {
        if (file.isFile && file.name.endsWith(".html")) {
            const postId = file.name.replace(".html", "");
            content += `<li><a href="/blog?post=${postId}">${postId}</a></li>`;
        }
    }
    return content;
}

import { env } from "node:process";
import { render } from "@deno/gfm";

export async function blogSave(req: Request) {
    // Check for GitHub token and personal token
    if (!env.GITHUB_TOKEN) {
        return new Response("GitHub token not found", { status: 500 });
    }
    if (!env.PERSONAL_TOKEN) {
        return new Response("Personal token not found", { status: 500 });
    }

    const auth = req.headers.get("Authorization") || "";
    if (auth !== `Bearer ${env.PERSONAL_TOKEN}`) {
        return new Response("Unauthorized", { status: 401 });
    }

    // Save the blog locally
    const formData: FormData = await req.formData();
    const file: File | null = formData?.get("file") as File;
    if (!file) {
        return new Response("No file uploaded", { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    await Deno.writeFile(`./blog/markdown/${file.name}`, uint8Array);
    console.log("Blog saved as md locally.");
    const content = new TextDecoder().decode(uint8Array);
    const htmlContent = render(content);
    await Deno.writeTextFile(`./blog/html/${file.name.replace(".md", ".html")}`, htmlContent);
    console.log("Blog saved as html locally.");

    // PUT to github pages repo

    fetch(`https://api.github.com/repos/SE6446/SE6446.github.io/contents/blogs/${file.name}`, {
        method: "PUT",
        headers: {
            "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message: "Add new blog post.",
            content: uint8Array
        })
    });
    
    return new Response("Blog saved successfully", { status: 200 });

}