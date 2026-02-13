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
 * Fetches GitHub repositories for a specific user and generates HTML content
 * to display them in a structured format.
 *
 * @deprecated This function is no longer used and will be removed in future versions. It was originally intended to embed Hugging Face spaces directly into the main page, but this approach has been reconsidered due to client side rendering beinf chosen over serverside.
 * 
 * @param htmlIndex - The HTML template string where the GitHub repositories
 *                    will be injected.
 * @returns A Promise that resolves to the updated HTML string with the
 *          GitHub repositories included.
 *
 * @throws Will log an error to the console if the fetch operation fails
 *         and replace the placeholder in the HTML with an error message.
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
        repoWidget = `</div><div class="row"><div class="col-md-4 mb-4">`;
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


/**
 * Fetches the list of models authored by "SE6446" from Hugging Face,
 * filters out private models, and generates HTML widgets for each public model.
 * The generated HTML is injected into the provided `htmlIndex` string by replacing
 * the `{{huggingface_models}}` placeholder.
 *
 * @deprecated This function is no longer used and will be removed in future versions. It was originally intended to embed Hugging Face spaces directly into the main page, but this approach has been reconsidered due to client side rendering beinf chosen over serverside.
 * 
 * @param htmlIndex - The HTML template string containing the `{{huggingface_models}}` placeholder.
 * @returns A promise that resolves to the updated HTML string with Hugging Face model widgets.
 *
 * @remarks
 * - Private models are skipped and not displayed.
 * - If fetching or processing fails, a fallback error message is injected.
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
        modelWidget = `</div><div class="row"><div class="col-md-4 mb-4">`;
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
    try{
        const privateProjects = Deno.readTextFileSync(
            "./projects/private_projects.jsonl",
        ).split("\n").filter((line) => line.trim() !== "").map((line) =>
            JSON.parse(line)
        );
        if (privateProjects.length === 0) {
            return htmlIndex.replace(
                "{{private_projects}}", "<p>No Private project to show for now.</p>"
            );
        }
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


    } catch (_error) {
        // This should only error out if the file doesn't exist, in which case we can just return the page with no private projects shown.
        return htmlIndex.replace(
            "{{private_projects}}",
            "<p>No Private project to show for now.</p>",
        );
    }
}

export async function huggingfaceGetModelCard(
  modelId: string,
): Promise<Response> {
  const uri = `https://huggingface.co/${modelId}/raw/main/README.md`;
  let template = Deno.readTextFileSync("./static/huggingface_template.html");
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
        ).replace("{{title}}", modelId),
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
      ).replace("{{title}}", modelId),
      {
        headers: { "Content-Type": "text/html" },
        status: 207,
      },
    );
  } else {
    const markdown = await response.text().then((text) =>
      text.replace(/---.*?---/s, "").trim()
    ); // Remove metadata from the top of the README
    //console.log(markdown);
    const htmlContent = render(markdown);
    //console.log(htmlContent);
    template = template.replace("{{content}}", htmlContent)
    template = template.replace("{{title}}", modelId);
    return new Response(template, {
      headers: { "Content-Type": "text/html" },
    });
  }
}

/**
 * Fetches and embeds public Hugging Face spaces authored by SE6446 into the provided HTML index.
 *
 * This function retrieves a list of spaces from the Hugging Face API, filters out private spaces
 * and those that do not use the Gradio SDK, and constructs an iframe for each valid space.
 * The resulting iframes are inserted into the HTML index at the location of the `{{spaces}}` placeholder.
 *
 * @deprecated This function is no longer used and will be removed in future versions. It was originally intended to embed Hugging Face spaces directly into the main page, but this approach has been reconsidered due to client side rendering beinf chosen over serverside.
 * @param htmlIndex - The HTML string where the spaces will be embedded.
 * @returns A Promise that resolves to the updated HTML string with the embedded spaces.
 */
export async function spacesHandler(htmlIndex: string): Promise<string> {
  const uri = `https://huggingface.co/api/spaces?author=SE6446`;
  try {
    const response = await fetch(uri);
    const data = await response.json();
    let spaceList = "";
    let count = 0;
    for (const space of data) {
      if (space.private) {
        continue; // Skip private
      }
      if (space.sdk !== "gradio") {
        continue; // Only support gradio spaces for now, as iframe embedding is much easier
      }
      if (space.id.toLowerCase().includes("portfolio")) {
        continue; // Don't want to embed the portfolio space within itself, that would be cursed.
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
      count++;
    }
    if (count === 0) {
      spaceList = "<p>No publically available spaces found.</p>";
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

function updatePrivateProjects(
  newProject: { name: string; description: string },
): void {
  const projectLine = JSON.stringify(newProject);
  Deno.writeTextFileSync(
    "./projects/private_projects.jsonl",
    projectLine + "\n",
    {
      append: true,
    },
  );
}

export async function receivePrivateProject(req: Request): Promise<Response> {
  const body = await req.json();
  try {
    updatePrivateProjects(body);
  } catch (error) {
    console.error("Error saving private project:", error);
    return new Response("Failed to save private project.", { status: 500 });
  }
  return new Response("Project received and saved.", { status: 200 });
}
