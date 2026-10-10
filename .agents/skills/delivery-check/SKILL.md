---
name: delivery-check
description: Verify that a repository change is within scope, validated, documented, and ready for developer review. Use before presenting completed work or preparing a commit.
---

# Delivery check

Use this skill at the end of a change, especially before a developer requests a commit. It is a review and validation procedure, not permission to commit or change unrelated files.

## Procedure

1. **Confirm scope**
   - Re-read the task and identify the files and behavior it requires.
   - Inspect `git status --short` and `git diff --stat`.
   - Look for generated files, secrets, unrelated edits, and accidental changes outside the requested scope.

2. **Read project guidance**
   - Confirm that the relevant `README.md` and local agent instructions were followed.
   - Check whether the change affects architecture, contracts, implementation status, or next steps.

3. **Run available validations**
   - Inspect the applicable `package.json`, README, and project instructions for real commands.
   - Run the relevant typecheck, build, lint, tests, or documentation checks that actually exist.
   - Do not report a check as successful if it was unavailable, skipped, or failed. Record the reason and output summary.

4. **Update memory when required**
   - Update `memory-bank/progress.md` for completed functionality, validation results, new limitations, or changed next steps.
   - Update `memory-bank/techContext.md` only for verified architecture, stack, contracts, or constraints.
   - Do not modify `CONTEXT.md` unless the developer explicitly authorizes it.

5. **Review final diff**
   - Run `git diff --check`.
   - Review `git diff --` for every changed file and confirm that the result is minimal and intentional.
   - Re-run `git status --short` and summarize remaining untracked or modified files.

## Output format

Report:

- scope reviewed;
- validations run and their results;
- memory-bank updates, or why none were necessary;
- remaining concerns or unavailable checks; and
- files changed.

Do not create commits, delete files, or perform destructive cleanup unless the developer explicitly asks for that action.
