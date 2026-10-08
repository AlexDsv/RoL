// Répartit des tâches de simulation sur tous les cœurs disponibles.
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";
import type { Overrides, Task, TaskResult } from "./tasks";

const WORKER = path.join(process.cwd(), "scripts/lib/worker.ts");
const BATCH = 40;

export async function runTasks(tasks: Task[], overrides: Overrides = {}, label = ""): Promise<TaskResult[]> {
  const batches: Task[][] = [];
  for (let i = 0; i < tasks.length; i += BATCH) batches.push(tasks.slice(i, i + BATCH));
  const results: TaskResult[][] = new Array(batches.length);
  const workers = Math.min(os.availableParallelism(), batches.length);
  let next = 0;
  let done = 0;
  const started = Date.now();

  await Promise.all(
    Array.from({ length: workers }, () =>
      new Promise<void>((resolve, reject) => {
        const child = spawn(process.execPath, ["--import", "tsx", WORKER], { stdio: ["pipe", "pipe", "inherit"] });
        const send = () => {
          if (next >= batches.length) {
            child.stdin.end();
            return;
          }
          const id = next++;
          child.stdin.write(JSON.stringify({ id, overrides, tasks: batches[id] }) + "\n");
        };
        createInterface({ input: child.stdout }).on("line", (line) => {
          const msg = JSON.parse(line) as { id: number; results: TaskResult[] };
          results[msg.id] = msg.results;
          done++;
          if (label && process.stderr.isTTY !== undefined) {
            const pct = Math.round((done / batches.length) * 100);
            if (done % Math.max(1, Math.floor(batches.length / 10)) === 0 || done === batches.length) {
              process.stderr.write(`  ${label} : ${pct} % (${Math.round((Date.now() - started) / 1000)} s)\n`);
            }
          }
          send();
        });
        child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`worker exit ${code}`))));
        send();
      }),
    ),
  );
  return results.flat();
}
