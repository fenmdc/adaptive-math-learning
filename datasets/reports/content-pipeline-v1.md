# Content Pipeline v1 Report

Generated at: 2026-06-21T14:41:13.929Z

## Summary

- Status: Ready
- Pipeline readiness: 99/100
- Problem quality readiness: 98/100
- Problems: 6344
- Auto-gradable: 6056/6344
- Multiple choice: 5749
- Full distractor coverage: 5749/5749
- Explanation quality: 97/100
- Remote assets: 0
- Thin chapters: 0
- Thin concepts: 0
- Import readiness: Ready for next batch

Ready: pipeline readiness 99/100, problem quality 98/100, diagnostic slots 37/37, staging rows 0, import status Ready for next batch.

## Production Gates

- Auto-Gradability: ready, 95/100. Target: 100% auto-checkable. 6056/6344 active problems are auto-gradable.
- Multiple Choice Keys: ready, 100/100. Target: 100% answer included in choices. 5749/5749 multiple-choice problems include the normalized correct answer.
- Distractor Coverage: ready, 100/100. Target: 100% wrong choices explained. 5749/5749 multiple-choice problems have full distractor coverage.
- Explanation Quality: ready, 97/100. Target: 95+/100 average quality. 6344/6344 explanations are complete.
- Offline Asset Locality: ready, 100/100. Target: 100% local image assets. 0 remote asset(s) remain.
- Chapter Coverage Floor: ready, 100/100. Target: 20+ problems per chapter. 0/221 chapter(s) are below the coverage floor.
- Concept Coverage Floor: ready, 100/100. Target: 5+ problems per concept. 0/50 concept(s) are below the coverage floor.
- Diagnostic Calibration: ready, 100/100. Target: All calibrated slots filled. 37/37 diagnostic slots selected.
- Staging Hygiene: ready, 100/100. Target: 0 active rows after promotion. 0 problem row(s), 0 distractor row(s), and 0 explanation row(s) are currently staged.

## Next Batch Readiness

- Status: Ready for next batch
- Ready: yes

- pass: Active staging is clean. 0 problem row(s) are waiting in active staging.
- pass: No repair-level production gates. All required gates are watch or ready.
- pass: Diagnostic remains calibrated. 37/37 diagnostic slots selected.
- pass: Explanations and distractors are production-ready. Practice feedback quality should remain complete before adding more source rows.

## Diagnostic Gate

- Slots selected: 37/37
- Ready: yes

- Foundation: 6/6 selected, minimum 5
- Bridge: 6/6 selected, minimum 4
- Algebra Readiness: 14/14 selected, minimum 6
- AMC8 Transfer: 11/11 selected, minimum 7

## Staging Snapshot

- Problem rows: 0
- Distractor rows: 0
- Explanation rows: 0

## Source Collections

- aops_prealgebra_textbook: ready, 1120 problem(s), 28 chapter(s), 100% auto-gradable, 100% explained, 100% distractors, 100% local assets
- jianzisheng_cn_junior_chapter_expansion_v1: ready, 1062 problem(s), 74 chapter(s), 100% auto-gradable, 100% explained, 100% distractors, 100% local assets
- ise_developmental_math_2e: ready, 1040 problem(s), 23 chapter(s), 100% auto-gradable, 100% explained, 100% distractors, 100% local assets
- amc8_past_papers_bulk: ready, 875 problem(s), 6 chapter(s), 100% auto-gradable, 100% explained, 100% distractors, 100% local assets
- college_algebra_stitz_zeager: ready, 300 problem(s), 10 chapter(s), 100% auto-gradable, 100% explained, 100% distractors, 100% local assets
- subjective_samples_v0: repair, 288 problem(s), 36 chapter(s), 0% auto-gradable, 100% explained, 100% distractors, 100% local assets
- jianzisheng_cn_math_bank_1_12: ready, 240 problem(s), 12 chapter(s), 100% auto-gradable, 100% explained, 100% distractors, 100% local assets
- mathematics_for_engineers_croft_davison: ready, 240 problem(s), 10 chapter(s), 100% auto-gradable, 100% explained, 100% distractors, 100% local assets
- quality_backfill_v1: ready, 195 problem(s), 17 chapter(s), 100% auto-gradable, 100% explained, 100% distractors, 100% local assets
- amc8_seed: ready, 75 problem(s), 1 chapter(s), 100% auto-gradable, 100% explained, 100% distractors, 100% local assets
- jianzisheng_cn_elementary_batch3_v0: ready, 60 problem(s), 6 chapter(s), 100% auto-gradable, 100% explained, 100% distractors, 100% local assets
- jianzisheng_cn_elementary_batch4_v0: ready, 60 problem(s), 6 chapter(s), 100% auto-gradable, 100% explained, 100% distractors, 100% local assets
- jianzisheng_cn_elementary_batch5_v0: ready, 60 problem(s), 6 chapter(s), 100% auto-gradable, 100% explained, 100% distractors, 100% local assets
- jianzisheng_cn_elementary_batch6_v0: ready, 60 problem(s), 6 chapter(s), 100% auto-gradable, 100% explained, 100% distractors, 100% local assets
- amc8_past_papers: ready, 50 problem(s), 6 chapter(s), 100% auto-gradable, 100% explained, 100% distractors, 100% local assets
- jianzisheng_cn_elementary_batch2_v0: ready, 48 problem(s), 6 chapter(s), 100% auto-gradable, 100% explained, 100% distractors, 100% local assets
- jianzisheng_cn_elementary_batch7_v0: ready, 48 problem(s), 6 chapter(s), 100% auto-gradable, 100% explained, 100% distractors, 100% local assets
- jianzisheng_cn_elementary_pilot_v0: ready, 36 problem(s), 6 chapter(s), 100% auto-gradable, 100% explained, 100% distractors, 100% local assets
- jianzisheng_cn_junior_grade7_batch1_v0: ready, 36 problem(s), 6 chapter(s), 100% auto-gradable, 100% explained, 100% distractors, 100% local assets
- jianzisheng_cn_junior_grade7_batch2_v0: ready, 36 problem(s), 6 chapter(s), 100% auto-gradable, 100% explained, 100% distractors, 100% local assets
- jianzisheng_cn_junior_grade7_batch3_v0: ready, 36 problem(s), 6 chapter(s), 100% auto-gradable, 100% explained, 100% distractors, 100% local assets
- jianzisheng_cn_junior_grade7_batch4_v0: ready, 36 problem(s), 6 chapter(s), 100% auto-gradable, 100% explained, 100% distractors, 100% local assets
- jianzisheng_cn_junior_grade8_batch2_v0: ready, 36 problem(s), 6 chapter(s), 100% auto-gradable, 100% explained, 100% distractors, 100% local assets
- jianzisheng_cn_junior_grade8_batch3_v0: ready, 36 problem(s), 6 chapter(s), 100% auto-gradable, 100% explained, 100% distractors, 100% local assets
- jianzisheng_cn_junior_grade8_batch4_v0: ready, 36 problem(s), 6 chapter(s), 100% auto-gradable, 100% explained, 100% distractors, 100% local assets
- jianzisheng_cn_junior_grade9_batch2_v0: ready, 36 problem(s), 6 chapter(s), 100% auto-gradable, 100% explained, 100% distractors, 100% local assets
- jianzisheng_cn_junior_grade9_batch3_v0: ready, 36 problem(s), 6 chapter(s), 100% auto-gradable, 100% explained, 100% distractors, 100% local assets
- jianzisheng_cn_junior_grade9_batch4_v0: ready, 36 problem(s), 6 chapter(s), 100% auto-gradable, 100% explained, 100% distractors, 100% local assets
- jianzisheng_cn_junior_grade9_pilot_v0: ready, 36 problem(s), 6 chapter(s), 100% auto-gradable, 100% explained, 100% distractors, 100% local assets
- local_seed_from_imo_folder: ready, 32 problem(s), 8 chapter(s), 100% auto-gradable, 100% explained, 100% distractors, 100% local assets
- seed: ready, 25 problem(s), 1 chapter(s), 100% auto-gradable, 100% explained, 100% distractors, 100% local assets
- jianzisheng_cn_junior_grade8_pilot_v0: ready, 24 problem(s), 6 chapter(s), 100% auto-gradable, 100% explained, 100% distractors, 100% local assets
- cn_curriculum_pilot_v0: ready, 10 problem(s), 10 chapter(s), 100% auto-gradable, 100% explained, 100% distractors, 100% local assets

## Next Actions

1. [low] Prepare the next source batch: The current production bank is healthy; the next useful step is controlled source expansion.
