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
  assert.equal(catalog.reduce((total, track) => total + track.total, 0), 8277);
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

test("Algebra 1 remediation supplement exposes four prerequisite repair chains", () => {
  const section = loadLearningSection({
    language: "en",
    track: "english-core",
    course: "Algebra 1",
    theme: "Remediation Foundations",
    limit: 100,
  });

  assert.equal(section.total, 30);
  assert.deepEqual(
    Object.fromEntries(
      ["linear", "func", "system", "factor"].map((cluster) => [
        cluster,
        section.problems.filter((problem) => problem.id.startsWith(`alg1_rem_v1_${cluster}_`)).length,
      ]),
    ),
    { linear: 8, func: 8, system: 7, factor: 7 },
  );
  assert.ok(section.problems.every((problem) => problem.difficulty <= 3 && problem.reviewStatus === "reviewed"));
});

test("AMC8 strategy supplement strengthens five underrepresented concepts", () => {
  const section = loadLearningSection({ language: "en", track: "amc", course: "AMC8", theme: "Strategy Foundations", limit: 100 });

  assert.equal(section.total, 30);
  assert.deepEqual(
    Object.fromEntries(["prop", "ie", "sim", "arc", "range"].map((cluster) => [
      cluster,
      section.problems.filter((problem) => problem.id.startsWith(`amc8_strategy_v1_${cluster}_`)).length,
    ])),
    { prop: 6, ie: 6, sim: 6, arc: 6, range: 6 },
  );
  assert.ok(section.problems.every((problem) => problem.reviewStatus === "reviewed"));
});

test("Chinese junior companion batch opens eight previously manual-only themes", () => {
  const themes = [
    "七年级有理数",
    "七年级整式初步",
    "七年级方程应用",
    "七年级不等式",
    "七年级三角形",
    "七年级几何应用",
    "七年级基础几何",
    "七年级统计初步",
  ];
  const companion = themes.flatMap((theme) => loadLearningSection({
    language: "zh",
    track: "cn-school",
    course: "CN Junior High Math",
    theme,
    limit: 10,
  }).problems.filter((problem) => problem.id.startsWith("cn_junior_auto_v1_")));

  assert.equal(companion.length, 24);
  assert.equal(new Set(companion.map((problem) => problem.id.split("_")[4])).size, 8);
  assert.ok(companion.every((problem) => problem.reviewStatus === "reviewed"));
});

test("Chinese senior companion batch opens seven manual-only themes across three grades", () => {
  const themes = [
    "高一函数基础",
    "高一二次函数",
    "高一三角函数",
    "高二数列",
    "高二解析几何",
    "高三导数",
    "高三概率统计",
  ];
  const companion = themes.flatMap((theme) => loadLearningSection({
    language: "zh",
    track: "cn-school",
    course: "CN Senior High Math",
    theme,
    limit: 10,
  }).problems.filter((problem) => problem.id.startsWith("cn_senior_auto_v1_")));

  assert.equal(companion.length, 21);
  assert.equal(new Set(companion.map((problem) => problem.id.split("_")[4])).size, 7);
  assert.ok(companion.every((problem) => problem.reviewStatus === "reviewed"));
});

test("Chinese Grade 8 companion batch opens eight core school themes", () => {
  const themes = [
    "八年级一次函数",
    "八年级方程组应用",
    "八年级勾股定理",
    "八年级坐标几何",
    "八年级全等三角形",
    "八年级相似三角形",
    "八年级统计",
    "八年级概率",
  ];
  const companion = themes.flatMap((theme) => loadLearningSection({
    language: "zh",
    track: "cn-school",
    course: "CN Junior High Math",
    theme,
    limit: 10,
  }).problems.filter((problem) => problem.id.startsWith("cn_grade8_auto_v1_")));

  assert.equal(companion.length, 24);
  assert.equal(new Set(companion.map((problem) => problem.id.split("_")[4])).size, 8);
  assert.ok(companion.every((problem) => problem.reviewStatus === "reviewed"));
});

test("Chinese Grade 9 companion batch opens eight core school themes", () => {
  const themes = [
    "九年级二次函数",
    "九年级二次方程",
    "九年级二次方程应用",
    "九年级相似应用",
    "九年级锐角三角函数",
    "九年级圆",
    "九年级统计",
    "九年级概率",
  ];
  const sections = themes.map((theme) => loadLearningSection({
    language: "zh",
    track: "cn-school",
    course: "CN Junior High Math",
    theme,
    limit: 10,
  }).problems.filter((problem) => problem.id.startsWith("cn_grade9_auto_v1_")));
  const companion = sections.flat();

  assert.equal(companion.length, 24);
  assert.ok(sections.every((problems) => problems.length === 3));
  assert.equal(new Set(companion.map((problem) => problem.id)).size, 24);
  assert.ok(companion.every((problem) => problem.reviewStatus === "reviewed"));
});
