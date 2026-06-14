# Staging Import Notes

Use this folder as the first stop for problems extracted from local documents.

Recommended local source root:

`/Users/fenmdc/Documents/IMO-中小学奥数`

Do not paste new material directly into `apps/web/data/problems.json`. Put it in
`problem_staging.csv`, add optional explanations and distractors, then run the
validator.

Current v0 command:

```bash
npm run validate:staging
```

Staging rows are allowed to be incomplete while drafting, but before promotion
they should include:

- answer
- concepts
- course/theme/chapter
- taxonomy layer/stage/problem type/cognitive tags
- solution or explanation notes
- choices and distractors for AMC-style multiple-choice items
