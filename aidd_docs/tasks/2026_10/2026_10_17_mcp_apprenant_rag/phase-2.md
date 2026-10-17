---
status: pending
---

# Instruction: RAG index and citations

## Architecture projection

```txt
✅ src/Service/Rag/*
✅ migration for search passages
✏️ learner MCP tools and publication synchronization
```

## Tasks to do

### `1)` Index published accessible passages

1. Extract safe plain text and stable metadata.
2. Start with MySQL text search and benchmark vector search separately.

## Test acceptance criteria

| Task | Acceptance criteria |
| --- | --- |
| 1 | Search returns cited, authorised passages only. |
