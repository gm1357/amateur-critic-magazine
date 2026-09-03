---
name: add-new-review
description: Read the markdown files on the root of the project, parse the information out of them, and add new reviews accordingly to src/data/reviews following the project's data structure. After successfully adding a review, delete the corresponding markdown file.
disable-model-invocation: true
---

1. Read the markdown files on the root of the project.
2. Parse the information from each markdown file.
3. Add the parsed information to `src/data/reviews` following the project's data structure.
4. After successfully adding a review, delete the corresponding markdown file.
5. Print a summary of the added reviews.

Important:

- Don't update any of the existing text of the review, even if the original text contains errors (list those on the summary).
- Don't run tests after adding the reviews; only update the data and print the summary.
- If a review with the same name already exists, do not overwrite it; delete the markdown file; list it in the summary instead.
- Ensure that all required fields for a review are present; if any are missing, list the issue in the summary.
