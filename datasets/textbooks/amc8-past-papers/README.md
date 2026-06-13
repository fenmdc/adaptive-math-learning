# AMC8 Past Papers

This dataset contains project-native structured rows converted from the local AMC8 past-paper OCR assets.

Current v0 batch:

- 2013 AMC8: 25 problems
- 2024 AMC8: 25 problems

Source collection: `amc8_past_papers`

The original PDFs are kept in `source-pdfs/`, OCR text in `extracted-text/`, and normalized problem rows in `problems.json`.

Dual positioning policy:

- Course/source position: each item keeps its AMC8 year and problem number in the id, source file, and notes.
- Learning position: each item is assigned to an AMC8 topic chapter for adaptive practice and recommendation.
