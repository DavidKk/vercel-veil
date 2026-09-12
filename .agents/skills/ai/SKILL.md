---
name: ai
description: All project agent skills (e.g. module generation, scaffolding) live in .ai/skills; read the relevant SKILL there so every IDE and tool uses the same instructions. Use when the user asks to add a module, scaffold code, or run a workflow that has a skill under .ai/skills/.
---

# Skills: use .ai/skills (single source of truth)

**All project agent skills** are defined under **`.ai/skills/`** so any IDE or tool can use the same instructions.

At the moment, `vercel-veil` does not define `.ai/skills/*` yet. When a skill is needed (e.g. scaffolding a new module/tool), we will add:

- `/.ai/skills/<name>/SKILL.md` with the agent instructions
- an optional pointer line here if we want it discoverable from Cursor
