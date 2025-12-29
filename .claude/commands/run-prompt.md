# Run Prompt

Execute a prompt from the `prompts/` directory.

**Usage:**
- `run prompt 1` - Execute prompts/1.md
- `run prompts 1 and 2` - Execute both (if parallel)
- `run prompts 1-3` - Execute prompts 1, 2, and 3

## Execution Steps

1. **Read** `prompts/{N}.md` completely
2. **Activate** the skill specified in the prompt (if any)
3. **Check relevant learnings in `docs/issues/`** based on task type:
   - Move/contracts → `docs/issues/move/README.md`
   - UI/frontend → `docs/issues/ui/README.md`
   - Indexer → `docs/issues/indexer/README.md`
   - Movement network → `docs/issues/movement/README.md`
   - Tooling → `docs/issues/tooling/README.md`
4. **Execute** ALL requirements in the prompt
5. **Verify** using the verification steps provided
6. **Delete** the prompt file after successful completion: `rm prompts/{N}.md`
7. **Report** what was accomplished
8. **List** remaining prompts in `prompts/`

## After Completion

Always report:
1. What was accomplished
2. Files created/modified
3. Any issues encountered
4. Remaining prompts in `prompts/`

## Verification Checklist

Before marking a prompt as complete:
- [ ] All requirements in the prompt are done
- [ ] Code compiles/builds without errors
- [ ] Verification steps pass
- [ ] No mocking or simulation - real implementation only
- [ ] File size limits respected (< 300 lines)

## Notes

- Delete executed prompts to avoid confusion
- If blocked, explain what's needed from the user
- Commit after each prompt if significant changes
