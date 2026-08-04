# AI Task Brief Builder

Gate 2 local Cloudflare Workers + TypeScript implementation for the frozen `ai-task-brief-builder` MCP app.

## Routes

- `GET /`
- `GET /health`
- `POST /mcp`

## MCP Tools

- `extract_task_goal`
- `build_test_requirements`
- `generate_task_brief`

The app is read-only, stateless, does not call external APIs, and does not perform external side effects.

## Local Checks

```sh
npm install
npm run typecheck
npm run test:tools
npm run test:mcp:local
```

`npm run test:mcp:local` exercises the Worker through HTTP-style `Request` objects without deploying the Worker.
