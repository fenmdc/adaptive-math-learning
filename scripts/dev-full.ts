import { exec } from "child_process";
import open from "open";

function run(cmd: string) {
  return new Promise((res) => {
    const p = exec(cmd);
    p.stdout?.pipe(process.stdout);
    p.on("close", res);
  });
}

async function main() {

  console.log("🚀 Running simulation...");
  await run("npm run simulate");

  console.log("📊 Starting dashboard...");
  const server = exec("npm run dev");

  server.stdout?.pipe(process.stdout);

  await new Promise(r => setTimeout(r, 3000));

  console.log("🌐 Opening browser...");
  await open("http://localhost:3000/dashboard");
}

main();
