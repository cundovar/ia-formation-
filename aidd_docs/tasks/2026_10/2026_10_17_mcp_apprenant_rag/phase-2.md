---
status: done
---

# Instruction: RAG index and citations

## Architecture projection

```txt
✅ src/Service/Rag/RagIndex.php
✅ migration for search passages
✅ learner MCP cited search
```

## Tasks to do

### `1)` Index published accessible passages

1. Extract safe plain text and stable metadata.
2. Start with MySQL text search and benchmark vector search separately.

## Test acceptance criteria

| Task | Acceptance criteria |
| --- | --- |
| 1 | Search returns cited, authorised passages only. |

## Delivery note

The MySQL FULLTEXT index is refreshed locally before learner search. It indexes published courses only; access is checked again after the search result is loaded, before a passage is returned.
