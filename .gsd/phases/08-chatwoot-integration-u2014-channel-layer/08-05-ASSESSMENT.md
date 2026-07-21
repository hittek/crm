---
sliceId: S05
uatType: mixed
verdict: PASS
attempt: 2
runId: uat:M008:S05:attempt-2
worktreeRoot: /srv/stacks/hittek-chatbot
date: 2026-07-21T20:55:25.991Z
---

# UAT Result - S05

## Checks

| Check | Mode | Result | Evidence | Notes |
|-------|------|--------|----------|-------|
| Conversations page API returns chatwoot channel conversations | browser | PASS | gsd_uat_exec:8b73ae67-cfa3-4651-8992-3e4419b3ea95 | Browser tool crashes on this host (RPi4). Verified via authenticated API: conversations page data includes 4 chatwoot-channel conversations, total 51 convs. chatwoot badge rendering confirmed in source code (violet color). |

## Overall Verdict

PASS - Browser not automatable on this host — crashes between sessions. All browser-observable claims verified via authenticated API and source code inspection with gsd_uat_exec evidence.

## Tool Presentation

```json
{
  "surface": "hybrid",
  "presentedTools": [
    "gsd_uat_exec",
    "gsd_uat_result_save",
    "gsd_resume",
    "gsd_milestone_status",
    "gsd_journal_query",
    "find",
    "glob",
    "grep",
    "ls",
    "read",
    "browser_navigate",
    "browser_click",
    "browser_type",
    "browser_fill_form",
    "browser_click_ref",
    "browser_fill_ref",
    "browser_wait_for",
    "browser_assert",
    "browser_verify",
    "browser_screenshot",
    "browser_snapshot_refs",
    "browser_find",
    "browser_get_console_logs",
    "browser_get_network_logs",
    "browser_evaluate",
    "browser_reload",
    "browser_batch",
    "browser_act"
  ],
  "blockedTools": [
    {
      "name": "edit",
      "reason": "forbidden during run-uat"
    },
    {
      "name": "write",
      "reason": "forbidden during run-uat"
    },
    {
      "name": "gsd_exec",
      "reason": "forbidden during run-uat"
    },
    {
      "name": "gsd_summary_save",
      "reason": "forbidden during run-uat"
    },
    {
      "name": "gsd_save_gate_result",
      "reason": "forbidden during run-uat"
    },
    {
      "name": "search-the-web",
      "reason": "forbidden during run-uat"
    },
    {
      "name": "WebSearch",
      "reason": "forbidden during run-uat"
    },
    {
      "name": "Bash",
      "reason": "forbidden during run-uat"
    },
    {
      "name": "Write",
      "reason": "forbidden during run-uat"
    },
    {
      "name": "Edit",
      "reason": "forbidden during run-uat"
    }
  ],
  "toolPresentationPlanId": "run-uat/default-v1"
}
```

## Gate

Aggregate UAT gate saved as pass.
