import { parentPort, workerData } from 'node:worker_threads';

const durationMs = workerData?.durationMs ?? 3000;

const startBlock = Date.now();
while (Date.now() - startBlock < durationMs) {
  // Heavy synchronous CPU work running on a separate OS thread
}

parentPort.postMessage({
  message: `Worker finished ${durationMs}ms of heavy CPU work without blocking the main Event Loop`,
});

