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
- Dates in the markdown are written `dd/mm/yyyy` (e.g. `05/09/2026` is 5 September 2026). Convert them to ISO `YYYY-MM-DD` for the `watched_date` field. Set `published_date` to the day you add the review (today), in the same ISO format.
- The markdown doesn't carry the film's `year`. Look the movie up (e.g. a web search) and set `year` to the year it first screened. If the title matches more than one film, or you can't confirm the year, leave `year` out and list it in the summary.
