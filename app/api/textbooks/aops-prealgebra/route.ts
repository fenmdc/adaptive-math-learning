import {
  loadTextbookChunks,
  loadTextbookKnowledge,
  loadTextbookManifest
} from "@/packages/textbook-data";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const include = url.searchParams.get("include") ?? "manifest";

  const response: {
    manifest: ReturnType<typeof loadTextbookManifest>;
    chunks?: ReturnType<typeof loadTextbookChunks>;
    knowledge?: ReturnType<typeof loadTextbookKnowledge>;
  } = {
    manifest: loadTextbookManifest()
  };

  if (include === "chunks" || include === "all") {
    response.chunks = loadTextbookChunks();
  }

  if (include === "knowledge" || include === "all") {
    response.knowledge = loadTextbookKnowledge();
  }

  return Response.json(response);
}
