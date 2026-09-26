# Context and memory

## Canonical context

- Read `CONTEXT.md` before making product, domain, architecture, or data-model decisions.
- Treat `CONTEXT.md` as the canonical business context for agents. Keep `CONTEXT.es.md` synchronized when the briefing changes.
- Read `memory-bank/projectbrief.md`, `memory-bank/techContext.md`, and `memory-bank/progress.md` before modifying the repository.
- Read the README for the target folder or module, plus any local instructions, before editing files there.

## Memory Bank responsibilities

- `projectbrief.md` describes what HealthCore is, why the project exists, its users, and its business goals.
- `techContext.md` describes the verified stack, architecture, contracts, constraints, and technical conventions.
- `progress.md` records implementation status, validation results, known gaps, and next steps.
- Do not place temporary task notes, branch state, or build output in `projectbrief.md` or `techContext.md`; use `progress.md` only when the information is relevant to the repository state.

## Updating memory

Update the appropriate memory-bank document when a change:

- completes or materially changes a feature;
- changes architecture, ownership, or the location of a component;
- introduces a relevant technical decision, limitation, or constraint; or
- changes validation status or the prioritized next steps.

Keep entries factual and distinguish verified implementation from planned architecture. Do not claim that a component exists when it is only described or proposed.

## Safety and scope

- Never replace or edit `CONTEXT.md` without explicit confirmation from the developer.
- Do not infer requirements from the general HealthCore briefing when the task does not require them.
- Protect patient, credential, token, and environment data; never record secrets or protected health information in memory-bank documents.
- Before finishing, inspect the diff and status to ensure that memory updates and other changes remain within the requested scope.
