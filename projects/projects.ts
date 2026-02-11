import { listProjects } from "../api/bootstrapper.ts";
import { render } from "@deno/gfm";

/**
 * @deprecated This function is no longer used and will be removed in future versions. It was originally intended to handle project-related requests and generate HTML content for the main page, but its functionality has been replaced by more specific handlers for GitHub repositories, Hugging Face models, and private projects as I no longer intend to host projects directly.
 * @returns
 */
export function projectHandler() {
  let htmlIndex = Deno.readTextFileSync("./static/index.html");
  const projects = listProjects();
  if (projects.length === 0) {
    htmlIndex = htmlIndex.replace("{{projects}}", "<p>No projects found.</p>");
    return htmlIndex;
  }
  let projectContent = "";
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
  projectContent += "</div></div>";

  htmlIndex = htmlIndex.replace("{{projects}}", projectContent);
  return htmlIndex;
}

/**
 * Edits the provided HTML index page by fetching public repositories from the GitHub API and injecting them into the page. Each repository is displayed as a card with its name, description, and a link to the repository on GitHub. If there is an error fetching the repositories, an error message is injected instead.
 * @param htmlIndex
 * @returns
 */
export async function githubHandler(htmlIndex: string): Promise<string> {
  try {
    // 1. Your 'await' call to the Deno backend or external API
    const response = await fetch("https://api.github.com/users/SE6446/repos");
    const data = await response.json();
    // 2. Process the data and generate HTML content
    let projectList = "";
    let count = 0;
    for (const repo of data) {
      let repoWidget: string;
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
                        <p class="card-text">${
        repo.description || "No description"
      }</p>
                    </div>
                </div>
            </a>
        </div>`;
      projectList += repoWidget;
      count++;
    }
    projectList += "</div>";
    htmlIndex = htmlIndex.replace("{{github_repos}}", projectList);
  } catch (error) {
    console.error("Error fetching GitHub repos:", error);
    htmlIndex = htmlIndex.replace(
      "{{github_repos}}",
      "<p>Failed to load GitHub repositories.</p>",
    );
  }
  return htmlIndex;
}

/*
 * Fetches public models from Hugging Face API and injects them into the HTML index page. Private models are skipped as they should not be exposed publicly.
 * @param htmlIndex
 * @returns Promise<string>
 */
export async function huggingfaceHandler(htmlIndex: string): Promise<string> {
  try {
    const response = await fetch(
      "https://huggingface.co/api/models?author=SE6446",
    );
    const data = await response.json();
    let count = 0;
    let modelList = "";
    for (const model of data) {
      if (model.private) {
        continue; // Skip private models, why the fuck does huggingface expose private models in the api?
        //Literally what's the point?!
      }
      let modelWidget: string;
      if (count % 3 === 0) {
        modelWidget = `<div class="row"><div class="col-md-4 mb-4">`;
      } else {
        modelWidget = `<div class="col-md-4 mb-4">`;
      }
      modelWidget += `
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">${model.modelId}</h5>
                        <p class="card-text">${
        model.pipeline_tag || "No pipeline tag"
      }</p>
                        <a href=/models/${model.modelId} target="_blank" class="btn btn-primary">View Model Card</a>
                        <a href="https://huggingface.co/${model.modelId}" target="_blank" class="btn btn-primary">View on Hugging Face</a>
                    </div>
                </div>    
            </div>`;
      modelList += modelWidget;
      count++;
    }
    modelList += "</div><div>";
    htmlIndex = htmlIndex.replace("{{huggingface_models}}", modelList);
  } catch (error) {
    console.error("Error fetching Hugging Face models:", error);
    htmlIndex = htmlIndex.replace(
      "{{huggingface_models}}",
      "<p>Failed to load Hugging Face models.</p>",
    );
  }
  return htmlIndex;
}

export function privateProjectHandler(htmlIndex: string): string {
  const privateProjects = Deno.readTextFileSync(
    "./projects/private_projects.jsonl",
  ).split("\n").filter((line) => line.trim() !== "").map((line) =>
    JSON.parse(line)
  );
  let privateProjectContent = "";
  for (const project of privateProjects) {
    privateProjectContent += `
        <div class="row">
            <div class="col-md-4 mb-4">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">${project.name}</h5>
                        <p class="card-text">${project.description}</p>
                    </div>
                </div>
            </div>`;
  }
  privateProjectContent += "</div></div>";
  htmlIndex = htmlIndex.replace("{{private_projects}}", privateProjectContent);
  return htmlIndex;
}

export async function huggingfaceGetModelCard(
  modelId: string,
): Promise<Response> {
  const uri = `https://huggingface.co/${modelId}/raw/main/README.md`;
  const template = Deno.readTextFileSync("./static/huggingface_template.html");
  const response = await fetch(uri);
  if (!response.ok) {
    console.error(
      `Failed to fetch model card for ${modelId}:`,
      response.statusText,
    );
    if (response.status === 404) {
      return new Response(
        template.replace(
          "{{content}}",
          `<h1>Model card not found for ${modelId}</h1>`,
        ),
        {
          headers: { "Content-Type": "text/html" },
          status: 404,
        },
      );
    }
    return new Response(
      template.replace(
        "{{content}}",
        `202 Accepted, ${response.status} ${response.statusText}`,
      ),
      {
        headers: { "Content-Type": "text/html" },
        status: 207,
      },
    );
  } else {
    const markdown = await response.text().then((text) =>
      text.replace(/---.*?---/s, "").trim()
    ); // Remove metadata from the top of the README
    console.log(markdown);
    const htmlContent = render(markdown);
    console.log(htmlContent);
    const finalTemplate = template.replace("{{content}}", htmlContent);
    return new Response(finalTemplate, {
      headers: { "Content-Type": "text/html" },
    });
  }
}

export async function spacesHandler(htmlIndex: string): Promise<string> {
  const uri = `https://huggingface.co/api/spaces?author=SE6446`;
  try {
    const response = await fetch(uri);
    const data = await response.json();
    let spaceList = "";
    for (const space of data) {
      if (space.private) {
        continue; // Skip private
      }
      if (space.sdk !== "gradio") {
        continue; // Only support gradio spaces for now, as iframe embedding is much easier
      }
      let name = space.id;
      name = name.replace("_", "-");
      name = name.replace("/", "-");
      const spaceWidget: string =
        `<div class="row"><iframe src="https://${name}.hf.space"
	        frameborder="0"
	        width="850"
	        height="450"
            ></iframe>
            </div>
            `;
      spaceList += spaceWidget;
    }
    htmlIndex = htmlIndex.replace("{{spaces}}", spaceList);
  } catch (error) {
    console.error("Error fetching Hugging Face spaces:", error);
    htmlIndex = htmlIndex.replace(
      "{{spaces}}",
      "<p>Failed to load Hugging Face spaces.</p>",
    );
  }
  return htmlIndex;
}
