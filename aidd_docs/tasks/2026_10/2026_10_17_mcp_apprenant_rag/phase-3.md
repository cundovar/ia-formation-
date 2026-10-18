---
status: done
---

# Instruction: QCM sessions

## Architecture projection

```txt
✅ learner QCM session service
✅ learner MCP tools
```

## Tasks to do

### `1)` Keep corrections server-side until submission

1. Return question choices without correctness fields.
2. Use short-lived sessions without durable scores.

## Test acceptance criteria

| Task | Acceptance criteria |
| --- | --- |
| 1 | Correct answers are absent before submission. |

## Delivery note

The session token is signed, bound to the learner, and expires after fifteen minutes. It records neither score nor attempt.
