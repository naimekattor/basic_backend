import http from "node:http";
import { Worker } from "node:worker_threads";
const products = [];
let nextProductId = 1;
function runHeavyCpuInWorker(durationMs = 3000) {
  const workerUrl = new URL("./cpu-worker.js", import.meta.url);

  console.log("Worker file:", workerUrl.href);

  return new Promise((resolve, reject) => {
    const worker = new Worker(workerUrl, {
      workerData: { durationMs },
    });

    worker.once("message", (message) => {
      console.log("Worker returned:", message);
      resolve(message);
    });

    worker.once("error", (error) => {
      console.error("Worker error:", error);
      reject(error);
    });

    worker.once("exit", (code) => {
      console.log("Worker exited with code:", code);

      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}

const server = http.createServer(async (request, response) => {
  const start = process.hrtime();
  const startCpu = process.cpuUsage();
  const { method, headers } = request;

  const parsedUrl = new URL(request.url ?? "/", "http://localhost:3000");
  const pathName = parsedUrl.pathname;

  request.on("error", (err) => {
    console.log(err);
  });

  response.on("finish", () => {
    const diff = process.hrtime(start);
    const timeInMs = diff[0] * 1000 + diff[1] / 1e6;
    const cpu = process.cpuUsage(startCpu);
    const cpuMs = (cpu.user + cpu.system) / 1000;
    console.log(
      `${method} ${pathName} ${response.statusCode} - Wall: ${timeInMs.toFixed(2)} ms | CPU: ${cpuMs.toFixed(2)} ms`,
    );
  });

  try {
    if (pathName === "/") {
      if (method === "GET") {
        response.writeHead(200, { "Content-Type": "text/plain" });
        response.end("Hello World");
      } else {
        response.writeHead(405, { "Content-Type": "text/plain" });
        response.end("Method Not Allowed");
      }
    } else if (pathName === "/health") {
      if (method === "GET") {
        response.writeHead(200, { "Content-Type": "text/plain" });
        response.end("Health Check OK");
      } else {
        response.writeHead(405, { "Content-Type": "text/plain" });
        response.end("Method Not Allowed");
      }
    } else if (pathName === "/products") {
      if (method === "POST") {
        let body = "";
        request.on("data", (chunk) => {
          body = body + chunk;
        });
        request.on("end", () => {
          if (!body.trim()) {
            sendJson(response, 400, {
              error: {
                code: "EMPTY_BODY",
                message: "Request body cannot be empty",
              },
            });
            return;
          }
          let parsedBody;

          try {
            parsedBody = JSON.parse(body);
          } catch (err) {
            sendJson(response, 400, {
              error: {
                code: "INVALID_BODY",
                message: "Request body must be valid JSON",
              },
            });
            return;
          }
          if (
            parsedBody === null ||
            typeof parsedBody !== "object" ||
            Array.isArray(parsedBody)
          ) {
            sendJson(response, 400, {
              error: {
                code: "VALIDATION_ERROR",
                message: "collection unchanged",
              },
            });
            return;
          }

          const validName =
            typeof parsedBody.name === "string" &&
            parsedBody.name.trim().length > 0;
          const validPrice =
            typeof parsedBody.price === "number" &&
            Number.isFinite(parsedBody.price) &&
            parsedBody.price >= 0;

          if (!validName || !validPrice) {
            sendJson(response, 400, {
              error: {
                code: "VALIDATION_ERROR",
                message:
                  "collection unchanged",
              },
            });
            return;
          }

          const product = {
  id: nextProductId++,
  name: parsedBody.name.trim(),
  price: parsedBody.price,
};
          products.push(product);

          sendJson(response, 201, {
            message: "Product created,product has an ID",
            product: product,
          });
        });
      } else {
        response.writeHead(405, { "Content-Type": "text/plain" });
        response.end("Method Not Allowed");
      }
    } else if (pathName === "/products/42") {
      if (method === "GET") {
        response.writeHead(200, { "Content-Type": "application/json" });
        const data = await simulatedAsynCDataLookup(42);
        response.end(JSON.stringify(data));
      } else {
        response.writeHead(405, { "Content-Type": "text/plain" });
        response.end("Method Not Allowed");
      }
    } else if (pathName === "/block") {
      if (method === "GET") {
        console.log(
          "-> [MAIN THREAD] Starting heavy CPU work (blocking event loop)...",
        );
        const startBlock = Date.now();
        while (Date.now() - startBlock < 3000) {
          // Synchronous blocking loop on main thread
        }
        console.log("-> [MAIN THREAD] Finished heavy CPU work.");
        response.writeHead(200, { "Content-Type": "text/plain" });
        response.end("Blocked request finished");
      } else {
        response.writeHead(405, { "Content-Type": "text/plain" });
        response.end("Method Not Allowed");
      }
    } else if (pathName === "/worker-cpu") {
      if (method === "GET") {
        console.log(
          "-> [WORKER THREAD] Offloading 3s heavy CPU work to worker thread...",
        );
        const result = await runHeavyCpuInWorker(3000);
        console.log("-> [WORKER THREAD] Finished heavy CPU work.");
        response.writeHead(200, { "Content-Type": "text/plain" });
        response.end(result.message);
      } else {
        response.writeHead(405, { "Content-Type": "text/plain" });
        response.end("Method Not Allowed");
      }
    } else {
      response.writeHead(404, { "Content-Type": "text/plain" });
      response.end("Not Found");
    }
  } catch (err) {
    console.error(err);
    if (!response.headersSent) {
      response.writeHead(500, { "Content-Type": "text/plain" });
    }
    response.end("Internal Server Error");
  }
});

server.listen(3000, () => {
  console.log("Server is running on port 3000");
});

const simulatedAsynCDataLookup = async (id) => {
  return new Promise((resolve, reject) => {
    if (id === 42) {
      setTimeout(() => {
        resolve({
          id: 42,
          name: "Product 42",
          price: 99.99,
        });
      }, 10000);
    } else {
      reject(new Error("Product not found"));
    }
  });
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json" });
  response.end(JSON.stringify(payload));
}
