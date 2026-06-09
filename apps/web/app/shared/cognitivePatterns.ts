import type { SimulationLog } from "../dashboard/types";

export type CognitivePatternSignal = {
  id: string;
  label: string;
  count: number;
  confidence: "low" | "medium" | "high";
  concepts: string[];
  sources: Array<"distractor" | "taxonomy" | "fluency" | "confidence" | "misconception">;
  evidence: string[];
  interpretation: string;
  nextAction: string;
};

const PATTERN_COPY: Record<string, {
  label: string;
  interpretation: string;
  nextAction: string;
}> = {
  fraction_fluency: {
    label: "Fraction fluency",
    interpretation: "Fraction or decimal representations may be slowing down otherwise accessible problems.",
    nextAction: "Use short Foundation computation items before returning to ratio, probability, or equation tasks."
  },
  inverse_operations: {
    label: "Inverse operations",
    interpretation: "Equation steps may be applied in the wrong order or with an unstable inverse operation.",
    nextAction: "Practice one-step and two-step equations with explicit undo-step prompts."
  },
  multi_step_planning: {
    label: "Multi-step planning",
    interpretation: "The learner may start correctly but lose the plan across two or more operations.",
    nextAction: "Use Standard bridge items that require writing the intermediate state before calculating."
  },
  sign_error_risk: {
    label: "Sign handling",
    interpretation: "Signed-number details may be creating errors that look like algebra misunderstandings.",
    nextAction: "Review integer operations in short mixed sets before increasing algebra difficulty."
  },
  formula_selection: {
    label: "Formula selection",
    interpretation: "The learner may know formulas but choose the wrong one for the measured quantity.",
    nextAction: "Use geometry contrast items that alternate area, perimeter, circumference, and angle facts."
  },
  sample_space_modeling: {
    label: "Sample-space modeling",
    interpretation: "Probability errors may come from choosing the wrong favorable or total outcome count.",
    nextAction: "Practice drawing or listing sample spaces before computing probabilities."
  },
  factor_structure: {
    label: "Factor structure",
    interpretation: "Number theory work may be relying on surface factors rather than prime structure.",
    nextAction: "Use factorization, GCD, and LCM items in a tight sequence."
  },
  data_position_reasoning: {
    label: "Data position reasoning",
    interpretation: "Statistics errors may come from confusing mean, median, mode, or range roles.",
    nextAction: "Use small ordered data sets and ask for the reason each statistic is selected."
  },
  unit_rate_modeling: {
    label: "Unit-rate modeling",
    interpretation: "Ratio problems may be solved with the rate flipped or with the wrong unit as the denominator.",
    nextAction: "Practice unit-rate items that explicitly name the unit being found."
  },
  percent_base_tracking: {
    label: "Percent base tracking",
    interpretation: "Percent errors may come from applying the percent to the wrong base quantity.",
    nextAction: "Use percent questions that ask the learner to identify the base before calculating."
  }
};

export function summarizeCognitivePatterns(logs: SimulationLog[]): CognitivePatternSignal[] {
  const patterns = new Map<string, CognitivePatternSignal>();

  logs.forEach((log) => {
    if (log.selectedDistractor) {
      addPattern(patterns, log.selectedDistractor.cognitiveTag, log, "distractor", [
        `Chose ${log.selectedChoiceLabel}: ${log.selectedDistractor.misconception}`
      ]);
      addPattern(patterns, log.selectedDistractor.misconception, log, "misconception", [
        log.selectedDistractor.explanation
      ]);
    }

    if (!log.correct) {
      log.taxonomy?.cognitiveTags.slice(0, 3).forEach((tag) => {
        addPattern(patterns, tag, log, "taxonomy", [`Missed a ${log.taxonomy?.problemType ?? "mixed"} item.`]);
      });
    }

    if ((log.responseTimeSeconds ?? 0) >= 120) {
      addPattern(patterns, "slow_fluency", log, "fluency", [`Response time was ${log.responseTimeSeconds}s.`]);
    }

    if ((log.confidence ?? 5) <= 2) {
      addPattern(patterns, "low_confidence", log, "confidence", [`Confidence was ${log.confidence}/5.`]);
    }
  });

  return [...patterns.values()]
    .map((pattern) => ({
      ...pattern,
      confidence: getPatternConfidence(pattern.count, pattern.sources.length)
    }))
    .sort((a, b) => b.count - a.count || confidenceRank(b.confidence) - confidenceRank(a.confidence))
    .slice(0, 6);
}

function addPattern(
  patterns: Map<string, CognitivePatternSignal>,
  id: string,
  log: SimulationLog,
  source: CognitivePatternSignal["sources"][number],
  evidence: string[]
) {
  const copy = PATTERN_COPY[id] ?? fallbackPatternCopy(id);
  const current = patterns.get(id) ?? {
    id,
    label: copy.label,
    count: 0,
    confidence: "low" as const,
    concepts: [],
    sources: [],
    evidence: [],
    interpretation: copy.interpretation,
    nextAction: copy.nextAction
  };

  patterns.set(id, {
    ...current,
    count: current.count + 1,
    concepts: unique([...current.concepts, ...log.concepts]).slice(0, 5),
    sources: unique([...current.sources, source]) as CognitivePatternSignal["sources"],
    evidence: unique([...current.evidence, ...evidence]).slice(0, 4)
  });
}

function fallbackPatternCopy(id: string) {
  return {
    label: humanize(id),
    interpretation: "This signal appears repeatedly enough to watch in future practice.",
    nextAction: "Use a short targeted mini session and compare speed, confidence, and accuracy."
  };
}

function getPatternConfidence(count: number, sourceCount: number): CognitivePatternSignal["confidence"] {
  if (count >= 3 || (count >= 2 && sourceCount >= 2)) return "high";
  if (count >= 2 || sourceCount >= 2) return "medium";
  return "low";
}

function confidenceRank(confidence: CognitivePatternSignal["confidence"]) {
  if (confidence === "high") return 2;
  if (confidence === "medium") return 1;
  return 0;
}

function unique<T>(values: T[]) {
  return [...new Set(values.filter(Boolean))];
}

function humanize(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
