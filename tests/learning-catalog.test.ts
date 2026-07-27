import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLearningCatalog,
  getProblemLanguage,
  loadLearningSection,
} from "../packages/learning-catalog";
import { loadLegacyProblems } from "../packages/problem-bank/legacy";

test("catalog separates Chinese and English problem banks", () => {
  const problems = loadLegacyProblems();
  const chinese = problems.filter((problem) => getProblemLanguage(problem) === "zh");
  const english = problems.filter((problem) => getProblemLanguage(problem) === "en");

  assert.equal(chinese.length, 2388);
  assert.equal(english.length, 5625);
  assert.equal(chinese.length + english.length, 8013);
  assert.ok(chinese.every((problem) => problem.locale && typeof problem.locale === "object"));
});

test("catalog exposes the four legacy language tracks with courses and themes", () => {
  const catalog = buildLearningCatalog();

  assert.deepEqual(catalog.map((track) => track.id), ["english-core", "amc", "cn-school", "cn-olympiad"]);
  assert.ok(catalog.every((track) => track.courses.length > 0));
  assert.ok(catalog.every((track) => track.courses.every((course) => course.themes.length > 0)));
  assert.ok(catalog.every((track) => track.courses.every((course) => course.themes.every((theme) => theme.autoGradable > 0))));
  assert.equal(catalog.reduce((total, track) => total + track.total, 0), 8067);
});

test("Chinese Olympiad supplements expand balanced topic coverage", () => {
  const track = buildLearningCatalog().find((item) => item.id === "cn-olympiad")!;
  const course = track.courses.find((item) => item.course === "CN Olympiad Lite")!;

  assert.equal(track.total, 56);
  assert.equal(track.autoGradable, 56);
  assert.deepEqual(
    Object.fromEntries(course.themes.map((theme) => [theme.name, theme.total])),
    { "几何思维": 18, "数论启蒙": 19, "计数启蒙": 19 },
  );
  const section = loadLearningSection({ language: "zh", track: "cn-olympiad", course: "CN Olympiad Lite", limit: 100 });
  assert.equal(section.total, 56);
  assert.equal(section.problems.length, 56);
  assert.ok(new Set(section.problems.map((problem) => problem.difficulty)).size >= 5);
});

test("learning sections honor language, course, and theme filters", () => {
  const chinese = loadLearningSection({ language: "zh", track: "cn-school", course: "CN Junior High Math", limit: 12 });
  const english = loadLearningSection({ language: "en", track: "amc", course: "AMC10", theme: "Geometry", limit: 12 });

  assert.equal(chinese.problems.length, 12);
  assert.ok(chinese.problems.every((problem) => problem.course === "CN Junior High Math"));
  assert.equal(english.total, 46);
  assert.ok(english.problems.every((problem) => problem.course === "AMC10"));
});
