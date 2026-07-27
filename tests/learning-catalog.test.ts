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
  assert.equal(catalog.reduce((total, track) => total + track.total, 0), 8124);
});

test("Chinese Olympiad supplements expand balanced topic coverage", () => {
  const track = buildLearningCatalog().find((item) => item.id === "cn-olympiad")!;
  const course = track.courses.find((item) => item.course === "CN Olympiad Lite")!;

  assert.equal(track.total, 83);
  assert.equal(track.autoGradable, 83);
  assert.deepEqual(
    Object.fromEntries(course.themes.map((theme) => [theme.name, theme.total])),
    { "几何思维": 27, "数论启蒙": 28, "计数启蒙": 28 },
  );
  const section = loadLearningSection({ language: "zh", track: "cn-olympiad", course: "CN Olympiad Lite", limit: 100 });
  assert.equal(section.total, 83);
  assert.equal(section.problems.length, 83);
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

test("English Core diagnostic supplement exposes five reviewed concept clusters", () => {
  const section = loadLearningSection({
    language: "en",
    track: "english-core",
    course: "Pre-Algebra",
    theme: "Diagnostic Foundations",
    limit: 100,
  });

  assert.equal(section.total, 30);
  assert.equal(section.problems.length, 30);
  assert.deepEqual(
    Object.fromEntries(
      ["ratio", "model", "ineq", "coord", "angle"].map((cluster) => [
        cluster,
        section.problems.filter((problem) => problem.id.startsWith(`en_core_diag_v1_${cluster}_`)).length,
      ]),
    ),
    { ratio: 6, model: 6, ineq: 6, coord: 6, angle: 6 },
  );
  assert.ok(section.problems.every((problem) => problem.reviewStatus === "reviewed"));
});
