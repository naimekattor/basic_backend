import { parentPort, workerData } from 'node:worker_threads';

const durationMs = workerData?.durationMs ?? 3000;
const start = Date.now();

while (Date.now() - start < durationMs) {
  // Deliberate CPU workload for this experiment
}

const elapsedMs = Date.now() - start;

parentPort.postMessage({
  message: `Worker finished its CPU workload.`,
  requestedMs: durationMs,
  actualMs: elapsedMs,
});