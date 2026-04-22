---
method: GET
path: /health
operationId: get-health
tags: [Health]
---

# Health check

Returns service liveness.

```omg.response.200
{
  status: "ok" | "degraded",
  uptime_seconds: integer
}
```
