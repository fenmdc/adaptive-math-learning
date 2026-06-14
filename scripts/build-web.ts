import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

const WEB_DIR = path.join(process.cwd(), "apps/web");
const BUILD_DIR = path.join(WEB_DIR, ".next-build");
const NEXT_ENV_PATH = path.join(WEB_DIR, "next-env.d.ts");

function main() {
  const originalNextEnv = fs.existsSync(NEXT_ENV_PATH) ? fs.readFileSync(NEXT_ENV_PATH, "utf8") : null;

  fs.rmSync(BUILD_DIR, { force: true, recursive: true });

  try {
    const result = spawnSync("npx", ["next", "build", "apps/web"], {
      env: {
        ...process.env,
        NEXT_DIST_DIR: ".next-build"
      },
      stdio: "inherit"
    });

    if (typeof result.status === "number" && result.status !== 0) {
      process.exitCode = result.status;
    }

    if (result.error) {
      throw result.error;
    }
  } finally {
    if (originalNextEnv !== null) {
      fs.writeFileSync(NEXT_ENV_PATH, originalNextEnv);
    }
  }
}

main();
