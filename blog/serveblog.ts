export function blogHandler(req: Request, uri:URLSearchParams) {
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
        if (file.isFile && file.name.endsWith(".html")) {
            const postId = file.name.replace(".html", "");
            content += `<li><a href="/blog?post=${postId}">${postId}</a></li>`;
        }
    }
    return content;
}


import { render } from "@deno/gfm";

export async function blogSave(req: Request, debug = false): Promise<Response> {
    // Check for GitHub token and personal token
    const result = [];
    const env = Deno.env;
    const githubToken = env.get("GITHUB_TOKEN");
    console.assert(githubToken != undefined)
    const personalToken = env.get("PERSONAL_TOKEN");
    if (!githubToken) {
        return new Response("GitHub token not found", { status: 500 });
    }
    if (!personalToken) {
        return new Response("Personal token not found", { status: 500 });
    }

    const auth = req.headers.get("Authorization") || "";
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
    const uint8Array = new Uint8Array();
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
            result.push(JSON.parse('{"id": 0, "message": "Failed to render blog to HTML."}, "status": 500'));
        }
        else if (stage === 2) {
            console.error("Failed to save blog HTML locally.", e);
            result.push(JSON.parse('{"id": 0, "message": "Failed to save blog HTML locally."}, "status": 500'));
        }
    } finally {
        result.push(JSON.parse('{"id": 0, "message": "Blog saved locally.", "status": 200}'));
    }

    

    // PUT to github pages repo

    const response = await fetch(`https://api.github.com/repos/SE6446/SE6446.github.io/contents/blogs/${file.name}`, {
        method: "PUT",
        headers: {
            "Authorization": `Bearer ${githubToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message: `Add new blog post. ${file.name}`,
            content: btoa(String.fromCharCode(...uint8Array))
        })
    });

    console.log("GitHub response:", response.status, response.statusText);
    
    if (response.ok) {
        console.log("Blog mirrored to GitHub Pages.");
        result.push(JSON.parse('{"id": 1, "message": "Blog mirrored to GitHub Pages.", "status": ' + response.status + '}'));
    } else {
        console.error("Failed to mirror blog to GitHub Pages.", response.status, response.statusText);
        result.push(JSON.parse('{"id": 1, "message": "Failed to mirror blog to GitHub Pages.", "status": ' + response.status + '}'));
    }

       
    



    return new Response(JSON.stringify(result), { status: 207, headers: { "Content-Type": "application/json" } });
}