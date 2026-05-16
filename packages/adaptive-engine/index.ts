export class AdaptiveEngine {

  constructor(problems) {
    this.problems = problems;
  }

  run(state, attempt) {

    // 1. update mastery
    state = updateMastery(state, attempt);

    // 2. detect weak concepts
    const weak = detectWeakConcepts(state.mastery);

    // 3. remediation check
    const remediation = shouldRemediate(state);

    // 4. select problem
    let next = selectNextProblem(state, this.problems);

    // 5. override if remediation needed
    if (remediation) {
      next = this.getRemediationProblem(weak);
    }

    return {
      next_problem: next,
      updated_state: state,
      weak_concepts: weak,
      remediation
    };
  }

  getRemediationProblem(weakConcepts) {
    return this.problems.find(p =>
      intersects(p.concepts, weakConcepts)
    );
  }
}
