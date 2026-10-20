const BACKEND_PORT = 9000;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;

/**
 * Route requests for the Foxglove image-processing demo.
 *
 * - GET  /foxglove          Serves the upload UI.
 * - POST /foxglove/upload   Receives an image, forwards it to the backend on
 *                           port 9000, and replies 201 Accepted.
 * - GET  /foxglove/stream   Proxies the backend's Server-Sent Events stream
 *                           of interim/final images to the browser.
 */
export async function serveFoxglove(req: Request): Promise<Response | null> {
  const url = new URL(req.url);

  if (url.pathname === "/foxglove" || url.pathname === "/foxglove/") {
    const html = Deno.readTextFileSync("./foxglove/static/index.html");
    return new Response(html, {
      headers: { "Content-Type": "text/html" },
    });
  }

  if (url.pathname === "/foxglove/upload" && req.method === "POST") {
    return await handleUpload(req);
  }

  if (url.pathname === "/foxglove/stream" && req.method === "GET") {
    return await handleStream();
  }

  return null;
}

async function handleUpload(req: Request): Promise<Response> {
  try {
    const formData = await req.formData();
    const file = formData.get("image");

    if (!(file instanceof File)) {
      return new Response("No image file provided", { status: 400 });
    }

    // Forward the uploaded file to the separate backend service.
    const backendForm = new FormData();
    backendForm.append("image", file);

    const backendResponse = await fetch(`${BACKEND_URL}/process`, {
      method: "POST",
      body: backendForm,
    });

    if (!backendResponse.ok) {
      const body = await backendResponse.text();
      console.error("Backend error:", backendResponse.status, body);
      return new Response("Backend processing failed", { status: 502 });
    }

    // Return 201 Accepted immediately so the frontend can start streaming.
    return new Response("Accepted", { status: 201 });
  } catch (err) {
    console.error("Foxglove upload error:", err);
    return new Response("Internal server error", { status: 500 });
  }
}

async function handleStream(): Promise<Response> {
  try {
    const backendResponse = await fetch(`${BACKEND_URL}/stream`);

    if (!backendResponse.ok || !backendResponse.body) {
      return new Response("Backend stream unavailable", { status: 502 });
    }

    return new Response(backendResponse.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (err) {
    console.error("Foxglove stream error:", err);
    return new Response("Stream unavailable", { status: 502 });
  }
}

/* -------------------------------------------------------------------------- */
/* Demo backend (port 9000)                                                   */
/* -------------------------------------------------------------------------- */

function makePlaceholderImage(color: string, label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="${color}"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="sans-serif" font-size="28">${label}</text></svg>`;
  return "data:image/svg+xml;base64," + btoa(svg);
}

/**
 * Starts a small demo backend on the given port.
 *
 * - POST /process  accepts the image and returns 201.
 * - GET  /stream   opens an SSE stream that emits a few interim frames and
 *                  then a `complete` event containing the final image.
 *
 * In production this would be a separate service; it is included here so the
 * demo works out of the box.
 */
export function startFoxgloveBackend(port = BACKEND_PORT) {
  Deno.serve({ port }, async (req) => {
    const url = new URL(req.url);

    if (url.pathname === "/process" && req.method === "POST") {
      // In a real backend you would store / queue the image here.
      return new Response("Accepted", { status: 201 });
    }

    if (url.pathname === "/stream" && req.method === "GET") {
      const body = new ReadableStream({
        start(controller) {
          const steps = [
            { color: "#7c3aed", label: "Step 1/4" },
            { color: "#2563eb", label: "Step 2/4" },
            { color: "#0891b2", label: "Step 3/4" },
            { color: "#059669", label: "Step 4/4" },
          ];
          let i = 0;

          const interval = setInterval(() => {
            if (i < steps.length) {
              const image = makePlaceholderImage(steps[i].color, steps[i].label);
              controller.enqueue(
                new TextEncoder().encode(`event: interim\ndata: ${image}\n\n`),
              );
              i++;
            } else {
              const final = makePlaceholderImage("#ea580c", "Processing Complete");
              controller.enqueue(
                new TextEncoder().encode(
                  `event: complete\ndata: ${JSON.stringify({ image: final })}\n\n`,
                ),
              );
              clearInterval(interval);
              controller.close();
            }
          }, 1000);
        },
      });

      return new Response(body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    return new Response("Not Found", { status: 404 });
  });

  console.log(`Foxglove demo backend listening on http://localhost:${port}`);
}
