# CN Math Text QA v0

Generated at: 2026-06-21T13:33:44.727Z
Mode: audit

## Summary

- CN text fields scanned: 38040
- Text fields changed: 0
- Issues before: 0
- Issues after: 0

## Issue Counts

| Issue | Before | After |
| --- | ---: | ---: |
| double_latex_escape | 0 | 0 |
| split_equation_after_math | 0 | 0 |
| english_step_label | 0 | 0 |
| english_answer_label | 0 | 0 |
| ascii_multiplication | 0 | 0 |
| ascii_inequality | 0 | 0 |
| adjacent_math_text | 0 | 0 |
| unbalanced_dollar | 0 | 0 |
| katex_render_error | 0 | 0 |

## Remaining Samples

No remaining QA issues detected.

## QA Policy

- `double_latex_escape`, `unbalanced_dollar`, and `katex_render_error` are blocking issues.
- `english_step_label` and `english_answer_label` should be removed from Chinese student-facing explanations.
- `ascii_multiplication` is normalized to either `×` in prose or `\times` inside LaTeX.
- `adjacent_math_text` is tracked as polish debt because Chinese prose often sits next to inline math intentionally.