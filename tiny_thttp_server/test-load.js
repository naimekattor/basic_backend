const BASE_URL = 'http://localhost:3000';

async function runScenario(title, heavyEndpoint) {
  console.log(`\n=============================================================`);
  console.log(`${title}`);
  console.log(`Sending 1 request to ${heavyEndpoint} (3s CPU) + 4 requests to /health`);
  console.log(`=============================================================`);

  const startTime = Date.now();
  const endpoints = [heavyEndpoint, '/health', '/health', '/health', '/health'];

  const requests = endpoints.map(async (path, index) => {
    const reqId = index + 1;
    const reqStart = Date.now();
    try {
      const res = await fetch(`${BASE_URL}${path}`);
      const text = await res.text();
      const durationMs = Date.now() - reqStart;
      return { reqId, path, status: res.status, durationMs, response: text };
    } catch (err) {
      return { reqId, path, status: 'ERROR', error: err.message };
    }
  });

  const results = await Promise.all(requests);
  const totalTime = Date.now() - startTime;

  console.log(`Total batch time: ${totalTime}ms`);
  console.table(results);
}

async function main() {
  // 1. Bad: 3s CPU work on the Main Thread (/block)
  await runScenario('SCENARIO 1: Main Thread Blocking (/block)', '/block');

  // 2. Good: 3s CPU work offloaded to a Worker Thread (/worker-cpu)
  await runScenario('SCENARIO 2: Worker Thread Offloading (/worker-cpu)', '/worker-cpu');
}

main();

