import assert from "node:assert/strict";
import test from "node:test";

import {
  loadTextbookDataset,
  loadTextbookRemediationMap,
  queryTextbookRemediationTargets,
  TEXTBOOK_DATASET_IDS,
} from "../packages/textbook-data";

test("textbook datasets keep manifest, chunk, and knowledge counts aligned", () => {
  for (const textbookId of TEXTBOOK_DATASET_IDS) {
    const { manifest, chunks, knowledge } = loadTextbookDataset(textbookId);

    assert.equal(manifest.id, textbookId);
    assert.equal(manifest.chunkCount, chunks.length);
    assert.equal(manifest.knowledgeItemCount, knowledge.length);
    assert.deepEqual(new Set(knowledge.map((item) => item.chunkId)), new Set(chunks.map((chunk) => chunk.id)));
  }
});

test("P0 remediation targets reference valid concepts and textbook chunks", () => {
  const conceptIds = new Set(
    require("../datasets/problem-bank/legacy-v1/concepts.json").map((concept: { id: string }) => concept.id),
  );
  const map = loadTextbookRemediationMap();
  const p0Targets = map.targets.filter((target) => target.priority === "P0");

  assert.equal(map.version, "textbook-remediation-map-v1");
  assert.ok(p0Targets.length >= 10);
  assert.ok(p0Targets.every((target) => target.status !== "unmapped"));
  for (const target of p0Targets) {
    assert.ok(target.conceptIds.every((conceptId) => conceptIds.has(conceptId)));
    for (const resource of target.resources) {
      const chunkIds = new Set(loadTextbookDataset(resource.textbookId).chunks.map((chunk) => chunk.id));
      assert.ok(resource.chunkIds.every((chunkId) => chunkIds.has(chunkId)));
    }
  }
});

test("remediation lookup filters weak concepts and priorities", () => {
  const statistics = queryTextbookRemediationTargets({ concept: "stats_median", priority: "P0" });
  const complexNumbers = queryTextbookRemediationTargets({ concept: "precalc_complex_numbers" });

  assert.deepEqual(statistics.map((target) => target.id), ["amc8-statistics-p0"]);
  assert.equal(complexNumbers.length, 1);
  assert.equal(complexNumbers[0].status, "unmapped");
});
