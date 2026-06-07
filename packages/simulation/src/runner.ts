import fs from "fs";
import path from "path";
import { AdaptiveEngine, Problem, StudentState } from "../../adaptive-engine";

export function runSimulation() {
  const problems = loadProblems();
  const engine = new AdaptiveEngine(problems);
  let state: StudentState = { mastery: {}, history: [] };
  let currentProblem = problems[0];

  const logs = [];

  for (let i = 0; i < 20; i++) {
    const correct = simulateAnswer(state, currentProblem, i);
    const result = engine.run(state, { problem: currentProblem, correct });
    state = result.updated_state;

    logs.push({
      step: i,
      problem: currentProblem.id,
      statement: currentProblem.statement,
      concepts: currentProblem.concepts,
      difficulty: currentProblem.difficulty,
      correct,
      weakConcepts: result.weak_concepts,
      remediation: result.remediation,
      nextProblem: result.next_problem.id,
      mastery: state.mastery,
      recommendationReason: result.recommendation.reason,
      recommendationScore: Math.round(result.recommendation.score)
    });

    currentProblem = result.next_problem;
  }

  writeJson("packages/simulation/output/logs.json", logs);
  writeJson("apps/web/data/logs.json", logs);
  writeJson("apps/web/data/problems.json", problems);

  console.log("Simulation done → logs.json generated");
}

function writeJson(filePath: string, data: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export function loadProblems(): Problem[] {
  const csvPath = path.join(process.cwd(), "datasets/problems/problems.csv");
  const conceptPath = path.join(process.cwd(), "datasets/concepts/concepts.csv");
  const curriculumPath = path.join(process.cwd(), "datasets/problems/problem_curriculum.csv");
  const conceptMap = loadConceptMap(conceptPath);
  const curriculumMap = loadCurriculumMap(curriculumPath);
  const [, ...rows] = fs.readFileSync(csvPath, "utf8").trim().split(/\r?\n/);

  return rows
    .filter(Boolean)
    .map(parseCsvLine)
    .map((columns) => {
      const concepts = splitList(columns[5]);
      const answer = columns[2] ?? "";

      return {
        id: columns[0],
        statement: columns[1],
        answer,
        answerType: inferAnswerType(answer),
        choices: splitList(columns[3]),
        difficulty: Number(columns[4]),
        source: inferProblemSource(columns[0]),
        primaryConcept: concepts[0] ?? "",
        concepts,
        prerequisiteConcepts: unique(
          concepts.flatMap((concept) => conceptMap[concept]?.prerequisites ?? [])
        ).filter((concept) => !concepts.includes(concept)),
        skills: splitList(columns[6]),
        patterns: splitList(columns[7]),
        misconceptions: splitList(columns[8]),
        isAutoGradable: Boolean(answer),
        solution: columns[9],
        curriculum: curriculumMap[columns[0]] ?? inferCurriculum(columns[0], concepts)
      } satisfies Problem;
    })
    .filter((problem) => problem.id && Number.isFinite(problem.difficulty));
}

function loadCurriculumMap(filePath: string) {
  if (!fs.existsSync(filePath)) return {} as Record<string, Problem["curriculum"]>;

  const [, ...rows] = fs.readFileSync(filePath, "utf8").trim().split(/\r?\n/);
  const entries = rows
    .filter(Boolean)
    .map(parseCsvLine)
    .map((columns) => [
      columns[0],
      {
        course: columns[1] || "AMC8 Foundations",
        theme: columns[2] || "Mixed Practice",
        chapter: columns[3] || "general",
        chapterTitle: columns[4] || "Mixed Practice",
        sequence: Number(columns[5]) || 999,
        sourceCollection: columns[6] || "seed"
      }
    ]);

  return Object.fromEntries(entries) as Record<string, Problem["curriculum"]>;
}

function inferCurriculum(id: string, concepts: string[]): Problem["curriculum"] {
  const primaryConcept = concepts[0] ?? "";
  const isPreAlgebra =
    primaryConcept.startsWith("prealg_") ||
    primaryConcept.startsWith("alg_") ||
    concepts.some((concept) => concept.startsWith("prealg_"));

  if (isPreAlgebra) {
    return {
      course: "Pre-Algebra",
      theme: "Expressions and Equations",
      chapter: "prealg-mixed",
      chapterTitle: "Pre-Algebra Mixed Practice",
      sequence: 900,
      sourceCollection: "seed"
    };
  }

    return {
      course: "AMC8",
    theme: inferTheme(primaryConcept),
    chapter: "amc8-mixed",
    chapterTitle: "AMC8 Mixed Practice",
    sequence: 900,
    sourceCollection: id.startsWith("amc8_") ? "amc8_seed" : "seed"
  };
}

function inferTheme(concept: string) {
  if (concept.startsWith("arith_")) return "Arithmetic and Proportional Reasoning";
  if (concept.startsWith("geo_")) return "Geometry";
  if (concept.startsWith("counting_")) return "Counting and Probability";
  if (concept.startsWith("nt_")) return "Number Theory";
  if (concept.startsWith("stats_")) return "Statistics";
  if (concept.startsWith("alg_") || concept.startsWith("prealg_")) return "Algebraic Reasoning";
  return "Mixed Practice";
}

function loadConceptMap(filePath: string) {
  const [, ...rows] = fs.readFileSync(filePath, "utf8").trim().split(/\r?\n/);
  const entries = rows
    .filter(Boolean)
    .map(parseCsvLine)
    .map((columns) => [
      columns[0],
      {
        id: columns[0],
        name: columns[1],
        prerequisites: splitList(columns[7])
      }
    ]);

  return Object.fromEntries(entries) as Record<string, { id: string; name: string; prerequisites: string[] }>;
}

function parseCsvLine(line: string) {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

function splitList(value: string) {
  const cleaned = cleanCell(value);
  return cleaned ? cleaned.split(";").map((item) => item.trim()).filter(Boolean) : [];
}

function cleanCell(value: string) {
  return value?.replace(/^"+|"+$/g, "").trim() ?? "";
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function inferAnswerType(answer: string): Problem["answerType"] {
  if (!answer) return "manual";
  if (/^-?\d+(?:\.\d+)?$/.test(answer)) return "numeric";
  if (/^-?\d+(?:\.\d+)?\/-?\d+(?:\.\d+)?$/.test(answer)) return "fraction";
  if (/[a-zπ^*]/i.test(answer)) return "symbolic";
  return "text";
}

function inferProblemSource(id: string) {
  return id.startsWith("amc8_") ? "amc8_seed" : "seed";
}

function simulateAnswer(state: StudentState, problem: Problem, step: number) {
  const mastery =
    problem.concepts.reduce(
      (sum, concept) => sum + (state.mastery[concept] ?? 0.5),
      0
    ) / Math.max(problem.concepts.length, 1);

  const difficultyPenalty = (problem.difficulty - 3) * 0.08;
  const probability = Math.max(0.15, Math.min(0.9, mastery + 0.1 - difficultyPenalty));
  const deterministicRoll = ((step * 37 + problem.id.length * 13) % 100) / 100;

  return deterministicRoll < probability;
}
