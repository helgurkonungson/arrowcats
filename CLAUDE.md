# Arrow Cats – notes for Claude

Full product context and rules live in the claude.ai project "ArrowCats" (project instructions + `claude/status.md`). Key rules:
- Reply to the user in Russian, no "ё", no long dash "—", few colons.
- `src/core` stays pure TS and fully tested (`npm test`); every generated level must be solvable.
- Game code talks to portals/stores only through `src/platform/IPlatform.ts`.
- Small targeted edits; run `npm test` and `npm run build` once per change set.
- Art: only Apache-2.0 Qwen-Image versions, never Qwen-Image-2.1.
