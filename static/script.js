function _copy() {
    const email = "archiemac07@outlook.com";
    navigator.clipboard.writeText(email).then(() => {
        alert("Email address copied to clipboard!");
    }).catch(err => {
        console.error("Failed to copy email: ", err);
    });
}

async function githubHandler(document) {
  try {
    // 1. Your 'await' call to the Deno backend or external API
    const response = await fetch("https://api.github.com/users/SE6446/repos");
    const data = await response.json();
    // 2. Process the data and generate HTML content
    let projectList = "";
    let count = 0;
    for (const repo of data) {
      let repoWidget = "";
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
    document.getElementById("content-github").innerHTML = projectList;
  } catch (error) {
    console.error("Error fetching GitHub repos:", error);
    document.getElementById("content-github").innerHTML =
      "<p>Failed to load GitHub repositories.</p>";
  }
}

async function huggingfaceHandler(document) {
  try {
    // this logic decides if we're on github pages or not, and if we are, it skips the runtime creation of huggingface content, as the content will already be created at build time. This is a bit janky, but it works and I don't want to spend more time on this than I already have.
    const notOnPages = await fetch("/health")
    let onPages = false;
    switch (notOnPages.status) {
      case 404:
        console.warn("Not on the main page, skipping the runtime creation of huggingface content.");
        onPages = true;
        break;
      case 200:
        console.log("On the main page, proceeding with Hugging Face API call.");
        break;
      default:
        console.warn(
          `Unexpected response from health check: ${notOnPages.status}, proceeding with Hugging Face API call just in case.`,
        );
    }
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
      let modelWidget="";
      if (count % 3 === 0) {
        modelWidget = `</div><div class="row"><div class="col-md-4 mb-4">`;
      } else {
        modelWidget = `<div class="col-md-4 mb-4">`;
      }
      modelWidget += `
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">${model.modelId}</h5>
                        <p class="card-text">Pipeline: ${
        model.pipeline_tag || "No pipeline tag"
      }</p>
                        ${!onPages ? `<a href=/models/${model.modelId} target="_blank" class="btn btn-primary">View Model Card</a>` : ""}
                        <a href="https://huggingface.co/${model.modelId}" target="_blank" class="btn btn-primary">View on Hugging Face</a>
                    </div>
                </div>    
            </div>`;
      modelList += modelWidget;
      count++;
    }
    modelList += "</div><div>";
    document.getElementById("content-huggingface").innerHTML = modelList;
  } catch (error) {
    console.error("Error fetching Hugging Face models:", error);
    document.getElementById("content-huggingface").innerHTML =
      "<p>Failed to load Hugging Face models.</p>";
  }
}


async function spacesHandler(document) {
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
      const spaceWidget =
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
    document.getElementById("content-spaces").innerHTML = spaceList;
  } catch (error) {
    console.error("Error fetching Hugging Face spaces:", error);
    document.getElementById("content-spaces").innerHTML =
      "<p>Failed to load Hugging Face spaces.</p>";
  }
}

self.addEventListener("DOMContentLoaded", () => {
  githubHandler(document);
  huggingfaceHandler(document);
  spacesHandler(document);
});