import fs from "node:fs";
import path from "node:path";

import {
  loadTextbookDataset,
  loadTextbookRemediationMap,
  TEXTBOOK_DATASET_IDS,
} from "../packages/textbook-data";

const root = process.cwd();
const conceptIds = new Set(
  (JSON.parse(
    fs.readFileSync(path.join(root, "datasets", "problem-bank", "legacy-v1", "concepts.json"), "utf8"),
  ) as Array<{ id: string }>).map((concept) => concept.id),
);
const failures: string[] = [];

for (const textbookId of TEXTBOOK_DATASET_IDS) {
  const { manifest, chunks, knowledge } = loadTextbookDataset(textbookId);
  const chunkIds = new Set(chunks.map((chunk) => chunk.id));
  const knowledgeChunkIds = new Set(knowledge.map((item) => item.chunkId));
  const problemCount = knowledge.reduce((total, item) => total + item.problemCount, 0);
  const exampleCount = knowledge.reduce((total, item) => total + (item.examples?.length ?? 0), 0);
  const extractedConcepts = new Set(knowledge.flatMap((item) => item.concepts));
  const ontologyMappedConcepts = [...extractedConcepts].filter((concept) => conceptIds.has(concept)).length;
  const needsOcrReview = manifest.notes.some((note) =>
    /OCR (was required|quality warnings|formulas should be treated as approximate)/i.test(note)
    || /needed OCR/i.test(note)
  );

  if (manifest.id !== textbookId) failures.push(`${textbookId}: manifest id is ${manifest.id}`);
  if (manifest.chunkCount !== chunks.length) failures.push(`${textbookId}: chunk count mismatch`);
  if (manifest.knowledgeItemCount !== knowledge.length) failures.push(`${textbookId}: knowledge count mismatch`);
  if (chunkIds.size !== chunks.length) failures.push(`${textbookId}: duplicate chunk ids`);
  if (knowledgeChunkIds.size !== knowledge.length) failures.push(`${textbookId}: duplicate knowledge chunk ids`);
  if ([...chunkIds].some((chunkId) => !knowledgeChunkIds.has(chunkId))) {
    failures.push(`${textbookId}: chunks missing knowledge entries`);
  }
  if ([...knowledgeChunkIds].some((chunkId) => !chunkIds.has(chunkId))) {
    failures.push(`${textbookId}: knowledge entries reference missing chunks`);
  }

  console.log(JSON.stringify({
    textbookId,
    pages: manifest.pageCount,
    chunks: chunks.length,
    knowledgeItems: knowledge.length,
    problemCount,
    exampleCount,
    ontologyMappedConcepts,
    extractedConcepts: extractedConcepts.size,
    ontologyMappingRate: extractedConcepts.size
      ? Number((ontologyMappedConcepts / extractedConcepts.size).toFixed(3))
      : 0,
    qualityFlags: [
      needsOcrReview ? "ocr-review-needed" : undefined,
      manifest.notes.some((note) => /lightweight|not a fully curated ontology/i.test(note)) ? "lightweight-index" : undefined,
      problemCount < Math.max(10, chunks.length * 0.1) ? "low-problem-extraction" : undefined,
    ].filter(Boolean),
  }));
}

const remediationMap = loadTextbookRemediationMap();
const targetIds = new Set<string>();
for (const target of remediationMap.targets) {
  if (targetIds.has(target.id)) failures.push(`Duplicate remediation target: ${target.id}`);
  targetIds.add(target.id);
  for (const conceptId of target.conceptIds) {
    if (!conceptIds.has(conceptId)) failures.push(`${target.id}: unknown concept ${conceptId}`);
  }
  if (target.status === "unmapped" && target.resources.length) {
    failures.push(`${target.id}: unmapped target has textbook resources`);
  }
  if (target.status !== "unmapped" && !target.resources.length) {
    failures.push(`${target.id}: mapped target has no textbook resources`);
  }
  for (const resource of target.resources) {
    const chunks = new Set(loadTextbookDataset(resource.textbookId).chunks.map((chunk) => chunk.id));
    for (const chunkId of resource.chunkIds) {
      if (!chunks.has(chunkId)) failures.push(`${target.id}: missing ${resource.textbookId}/${chunkId}`);
    }
  }
}

const priorities = Object.fromEntries(["P0", "P1", "P2"].map((priority) => [
  priority,
  remediationMap.targets.filter((target) => target.priority === priority).length,
]));
const statuses = Object.fromEntries(["mapped", "partial", "unmapped"].map((status) => [
  status,
  remediationMap.targets.filter((target) => target.status === status).length,
]));
console.log(JSON.stringify({ remediationMap: remediationMap.version, priorities, statuses }));

if (failures.length) {
  console.error("Textbook remediation audit failed:\n" + failures.join("\n"));
  process.exit(1);
}

console.log(`Textbook remediation audit passed: ${TEXTBOOK_DATASET_IDS.length} datasets, ${remediationMap.targets.length} targets.`);
