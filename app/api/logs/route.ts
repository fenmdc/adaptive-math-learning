import * as fs from "fs";
import path from "path";

export async function GET() {

  const filePath = path.join(
    process.cwd(),
    "packages/simulation/output/logs.json"
  );

  const data = fs.readFileSync(filePath, "utf-8");

  return Response.json(JSON.parse(data));
}