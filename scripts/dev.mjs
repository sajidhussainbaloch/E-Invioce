import { spawn } from "node:child_process";

const jobs = [
  { name: "api", command: "npm", args: ["run", "dev", "-w", "@invoice-bank/api"] },
  { name: "web", command: "npm", args: ["run", "dev", "-w", "@invoice-bank/web"] },
];

const children = jobs.map(({ name, command, args }) => {
  const child = spawn(command, args, { stdio: "pipe", shell: true });
  const prefix = `[${name}] `;
  child.stdout.on("data", (d) => process.stdout.write(prefix + d));
  child.stderr.on("data", (d) => process.stderr.write(prefix + d));
  child.on("exit", (code) => {
    console.log(`${prefix}exited with code ${code}`);
    process.exit(code ?? 0);
  });
  return child;
});

process.on("SIGINT", () => {
  for (const c of children) c.kill("SIGTERM");
  process.exit(0);
});