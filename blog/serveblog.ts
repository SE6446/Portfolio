export function blogHandler(uri:URLSearchParams) {
    if (uri.has("post")) {
        let htmlTemplate = Deno.readTextFileSync("./blog/static/template.html");
        //console.log(htmlTemplate);
        const postId = uri.get("post");
        const htmlContent = Deno.readTextFileSync(`./blog/html/${postId}.html`);
        //console.log(`Serving blog post: ${postId}`);
        //console.log(htmlContent);
        htmlTemplate = htmlTemplate.replace("{{title}}", postId || "Blog");        
        htmlTemplate = htmlTemplate.replace("{{content}}", htmlContent);
        //console.log(htmlTemplate);
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
        const fileInfo = Deno.statSync(`./blog/html/${file.name}`);
        const mtime = fileInfo.mtime ? fileInfo.mtime.getTime() : 0;
        const htmlContent = Deno.readTextFileSync(`./blog/html/${file.name}`);
        const abstractMatch = htmlContent.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
        const abstract = abstractMatch ? abstractMatch[1].substring(0, 200) + "..." : "";
        if (file.isFile && file.name.endsWith(".html")) {
            const postId = file.name.replace(".html", "");
            content += `<li><div class="card"><a href="/blog?post=${postId}">${postId}</a><p>${new Date(mtime).toUTCString()}</p><p>${abstract}</p></div></li>`;
        }
    }
    return content;
}


import { render } from "@deno/gfm";

export async function blogSave(req: Request): Promise<Response> {
    // Check for GitHub token and personal token
    const env = Deno.env;
    const personalToken = env.get("PERSONAL_TOKEN");
    if (!personalToken) {
        return new Response("Personal token not found", { status: 500 });
    }

    const auth = req.headers.get("Authorization") || "";
    console.log("Received blog save request with auth:", auth, "and personal token:", personalToken);
    if (auth !== `Bearer ${personalToken}`) {
        return new Response("Unauthorized", { status: 401 });
    }

    // Save the blog locally
    
    const formData: FormData = await req.formData();
    const file: File | null = formData?.get("file") as File;
    if (!file) {
        return new Response("No file uploaded", { status: 400 });
    }
    // To figure out where we are in the process and thus where we fail, we use stage variable for logging.
    let stage = 0;
    
    try {
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        await Deno.writeFile(`./blog/markdown/${file.name}`, uint8Array);
        console.log("Blog saved as md locally.");
        stage++;
        const content = new TextDecoder().decode(uint8Array);
        const htmlContent = render(content);
        stage++;
        await Deno.writeTextFile(`./blog/html/${file.name.replace(".md", ".html")}`, htmlContent);
        console.log("Blog saved as html locally.");
    } catch (e) {
        if (stage === 0) {
            console.error("Failed to save blog locally.", e);
            //result.push("Failed to save blog locally.");
            return new Response("Failed to save blog locally.", { status: 500 });
        }
        else if (stage === 1) {
            console.error("Failed to render blog to HTML.", e);
            return new Response("Failed to render blog to HTML.", { status: 500 });
        }
        else if (stage === 2) {
            console.error("Failed to save blog HTML locally.", e);
            return new Response("Failed to save blog HTML locally.", { status: 500 });
        }
    }
    return new Response("Blog saved locally.", { status: 200 });
    
}

export async function blogDelete(req: Request): Promise<Response> {
    // Check for GitHub token and personal token
    const env = Deno.env;
    const personalToken = env.get("PERSONAL_TOKEN");
    if (!personalToken) {
        return new Response("Personal token not found", { status: 500 });
    }
    const auth = req.headers.get("Authorization") || "";
    console.log("Received blog delete request with auth:", auth, "and personal token:", personalToken);
    if (auth !== `Bearer ${personalToken}`) {
        return new Response("Unauthorized", { status: 401 });
    }
    const formData: FormData = await req.formData();
    const postId: string | null = formData?.get("postId") as string;
    if (!postId) {
        return new Response("No post ID provided", { status: 400 });
    }
    try {
        await Deno.remove(`./blog/markdown/${postId}.md`);
        await Deno.remove(`./blog/html/${postId}.html`);
        console.log(`Blog post ${postId} deleted successfully.`);
        return new Response("Blog post deleted successfully.", { status: 200 });
    } catch (e) {
        console.error(`Failed to delete blog post ${postId}.`, e);
        return new Response("Failed to delete blog post.", { status: 500 });
    }
}