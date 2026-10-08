// Processus de calcul : lit des lots de tâches (JSON, une ligne par lot) sur
// l'entrée standard et renvoie les résultats sur la sortie standard.
import { createInterface } from "node:readline";
import { applyOverrides, runTask, type Overrides, type Task } from "./tasks";

const rl = createInterface({ input: process.stdin });
rl.on("line", (line) => {
  const msg = JSON.parse(line) as { id: number; overrides: Overrides; tasks: Task[] };
  applyOverrides(msg.overrides);
  const results = msg.tasks.map(runTask);
  process.stdout.write(JSON.stringify({ id: msg.id, results }) + "\n");
});
