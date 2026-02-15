export async function addProjectToPortfolio(request: Request): Promise<void> {
    const requestData: FormData = await request.formData();
    // Process the request data and add the project to the portfolio
    const projectStructure: File|null = requestData?.get("structure") as File;
    if (!projectStructure) {
        throw new Response("Project structure file is missing", { status: 400 });
    }
    const structureText = await projectStructure.text();
    const structure = JSON.parse(structureText);
    console.log("Adding project with structure:", structure);
    const title: string = structure.title || null;
    if (!title) {
        throw new Response("Project title is missing", { status: 400 });
    }
    Deno.mkdirSync(`./projects/${title}`, { recursive: true });
    const paths = structure.paths || [];
    const files: File[] = requestData.getAll("files") as File[];
    for (const path of paths) {
        const file = files.find(f => f.name === path.split('/').pop());
        if (file) {
            const fileData = await file.arrayBuffer();
            const uint8Array = new Uint8Array(fileData);
            Deno.writeFileSync(`./projects/${title}/${path}`, uint8Array);
            console.log(`Saved file: ./projects/${title}/${path}`);
        } else {
            console.warn(`File not found in upload: ${path}`);
        }
    }
    console.log(`Project ${title} added successfully.`);
}

export function listProjects(): string[] {
    const projectsDir = "./projects";
    const projects: string[] = [];
    for (const dirEntry of Deno.readDirSync(projectsDir)) {
        if (dirEntry.isDirectory) {
            projects.push(dirEntry.name);
        }
    }
    return projects;
}

export function healthCheck(): Response {
    return new Response("OK", { status: 200 });
}