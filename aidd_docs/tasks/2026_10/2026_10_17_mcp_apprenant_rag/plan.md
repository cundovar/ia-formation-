---
objective: "Expose an isolated learner MCP that only returns each learner's accessible educational content, then extend it safely with RAG, QCM, progression, and laboratory guidance."
status: in-progress
---

# Plan: learner MCP and RAG

## Overview

| Field | Value |
| --- | --- |
| **Goal** | Connect a learner's assistant to the authorised course library without granting editorial access. |
| **Source** | User request in `Texte collé.txt`, 17 October 2026. |

## Phases

| # | Phase | File |
| --- | --- | --- |
| 1 | Read-only learner MCP — delivered, functional tests pending | [`phase-1.md`](./phase-1.md) |
| 2 | RAG index and citations | [`phase-2.md`](./phase-2.md) |
| 3 | QCM sessions | [`phase-3.md`](./phase-3.md) |
| 4 | Consented progress | [`phase-4.md`](./phase-4.md) |
| 5 | Laboratory guidance | [`phase-5.md`](./phase-5.md) |

## Resources

| Source | Verified |
| --- | --- |
| https://help.openai.com/en/articles/12584461-developer-mode-and-full-mcp-connectors-in-chatgpt | Remote OAuth MCP and write-action limitations. |
| https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp | Remote MCP OAuth configuration. |
| https://qdrant.tech/documentation/installation/ | Dedicated vector storage and operations requirements. |

## Decisions

| Decision | Why |
| --- | --- |
| Keep `/mcp` and add `/mcp/apprenant`. | Resource and scope separation prevents editorial privilege escalation. |
| Start with MySQL text search. | It uses the current database and needs no new service. |
| Defer progress writes. | They are outside the current product scope and require explicit consent design. |
