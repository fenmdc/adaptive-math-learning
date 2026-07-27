import { queryLegacyProblems } from "@/packages/problem-bank/legacy";

export async function GET(request: Request) {
  const search = new URL(request.url).searchParams;
  const result = queryLegacyProblems({
    offset: Number(search.get("offset") ?? 0),
    limit: Number(search.get("limit") ?? 25),
    course: search.get("course") || undefined,
    concept: search.get("concept") || undefined,
    answerType: search.get("answerType") || undefined,
  });

  return Response.json(result, {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
