import {
  COLLEGE_ALGEBRA_STITZ_ZEAGER_ID,
  loadTextbookChunks,
  loadTextbookKnowledge,
  loadTextbookManifest
} from "@/packages/textbook-data";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const include = url.searchParams.get("include") ?? "manifest";
  const textbookId = COLLEGE_ALGEBRA_STITZ_ZEAGER_ID;

  const response: {
    manifest: ReturnType<typeof loadTextbookManifest>;
    chunks?: ReturnType<typeof loadTextbookChunks>;
    knowledge?: ReturnType<typeof loadTextbookKnowledge>;
  } = {
    manifest: loadTextbookManifest(textbookId)
  };

  if (include === "chunks" || include === "all") {
    response.chunks = loadTextbookChunks(textbookId);
  }

  if (include === "knowledge" || include === "all") {
    response.knowledge = loadTextbookKnowledge(textbookId);
  }

  return Response.json(response);
}
