import { queryTextbookRemediationTargets } from "@/packages/textbook-data";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const priority = url.searchParams.get("priority");
  const targets = queryTextbookRemediationTargets({
    course: url.searchParams.get("course") ?? undefined,
    theme: url.searchParams.get("theme") ?? undefined,
    concept: url.searchParams.get("concept") ?? undefined,
    priority: priority === "P0" || priority === "P1" || priority === "P2" ? priority : undefined,
  });

  return Response.json({ total: targets.length, targets });
}
