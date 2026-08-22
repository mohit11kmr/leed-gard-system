# Contributing to LeadGuard

1. Fork the repository and create a branch from `main`.
2. Copy `.env.example` to `.env`, start PostgreSQL and Redis with Docker, then run `npm install`, `npm run prisma:generate`, and `npm run prisma:migrate`.
3. Run `npm run typecheck`, `npm run lint`, and `npm test` before opening a pull request.
4. Use Conventional Commits, such as `feat: add bulk scan endpoint` or `fix: reject DNS rebinding`.
5. Describe the behavior change, tests, migration needs, and operational configuration in the pull request.

Keep changes focused, add tests for security and API behavior, and never commit credentials or `.env` files.
