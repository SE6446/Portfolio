import { listProjects } from "../api/bootstrapper.ts";

export function projectHandler() {
    let htmlIndex = Deno.readTextFileSync("./static/index.html");
    const projects = listProjects();
    let projectContent = '';
    for (const project of projects) {
        projectContent += `
        <div class="row">
            <div class="col-md-4 mb-4">
                <a href="/projects/${project}">
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">${project}</h5>
                        </div>
                    </div>
                </a>
            </div>`;
    }
    projectContent += '</div>';

    htmlIndex = htmlIndex.replace('{{projects}}', projectContent);
    return htmlIndex;
}
export async function githubHandler(htmlIndex: string): Promise<string> {
    try {
    // 1. Your 'await' call to the Deno backend or external API
    const response = await fetch('https://api.github.com/users/SE6446/repos');
    const data = await response.json();
    // 2. Process the data and generate HTML content
    let projectList = '';
    let count = 0;
    for (const repo of data) {
        let repoWidget:string
        if (count % 3 === 0) {
            repoWidget = `<div class="row"><div class="col-md-4 mb-4">`;
        } else {
            repoWidget = `<div class="col-md-4 mb-4">`;
        }
        repoWidget += `
            <a href="${repo.html_url}" target="_blank">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">${repo.full_name}</h5>
                        <p class="card-text">${repo.description || "No description"}</p>
                    </div>
                </div>
            </a>
        </div>`;
        projectList += repoWidget;
        count++;
    }
    projectList += '</div>';
    htmlIndex = htmlIndex.replace('{{github_repos}}', projectList);
    } catch (error) {
        console.error("Error fetching GitHub repos:", error);
        htmlIndex = htmlIndex.replace('{{github_repos}}', '<p>Failed to load GitHub repositories.</p>');
    }
    return htmlIndex;
}