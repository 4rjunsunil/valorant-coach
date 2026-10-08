# Copilot Instructions: Valorant AI Match Coach

## Project overview
A full-stack personal portfolio app. The user enters a Riot ID, the backend fetches recent Valorant matches, calculates stats in code, and asks Gemini to turn those stats into short coaching feedback.

This is a non-commercial project. It uses an unofficial Valorant API and is **not affiliated with or endorsed by Riot Games**.

## Tech stack
- **Frontend:** React, TypeScript, Vite
- **Backend:** Node.js, Express.js, TypeScript
- **Database:** MongoDB (Mongoose), used mainly as a cache
- **External APIs:**
  - HenrikDev unofficial Valorant API (match data). Check https://docs.henrikdev.xyz for endpoints. Do not guess endpoint paths or response shapes.
  - valorant-api.com (static data: agents, maps, images; no key needed)
  - Google Gemini API (free tier) via the official Google Gen AI SDK
- **Deployment:** Vercel (frontend), Render (backend), MongoDB Atlas

## Architecture rules
1. **Stats are calculated in our own code, never by the LLM.** Compute K/D, ACS, headshot %, win rate by agent and map in `services/stats`. Send Gemini only a small JSON summary of the results.
2. **Gemini only explains the numbers.** The prompt must say to use only the provided stats and not to invent any. Ask for short, specific, actionable feedback.
3. **All third-party calls go through the backend.** The frontend never calls HenrikDev or Gemini directly, and never sees an API key.
4. **Cache aggressively.** Store fetched matches and generated coaching reports in MongoDB with a TTL, and check the cache before calling any external API.
5. **Respect rate limits.** Add `express-rate-limit` to our own routes. For external calls, handle HTTP 429 with exponential backoff and a retry limit, then return a clear error.

## Folder structure
```
/client
  /src
    /components     # UI components
    /pages          # route-level views
    /api            # typed fetch helpers for our backend
    /types
/server
  /src
    /routes         # Express routers only (no business logic)
    /controllers
    /services
      henrik.ts     # HenrikDev API client
      valorantApi.ts# static data client
      stats.ts      # pure stat calculations
      gemini.ts     # prompt building + Gemini call
    /models         # Mongoose schemas (match cache, report cache)
    /middleware     # rate limit, error handler, validation
    /config         # env loading
```

## Coding conventions
- Use TypeScript strictly. No `any`; define types for API responses and stats objects.
- Use `async/await` with `try/catch`. Route handlers pass errors to a central Express error handler.
- Validate all request input (for example with `zod`) before using it, including Riot ID and region.
- Keep route files thin. Put logic in services, and keep `stats.ts` made of pure, easily testable functions.
- Use named exports. Use `const` by default.
- Keep functions small, with clear names. Add short comments only where the logic is not obvious.
- Use React function components and hooks. Handle loading, error and empty states on every data fetch.
- Keep the UI responsive and accessible (semantic HTML, labels on inputs, readable contrast).

## Security and secrets
- Read keys only from environment variables (`HENRIK_API_KEY`, `GEMINI_API_KEY`, `MONGODB_URI`, `GEMINI_MODEL`). Never hardcode or log them.
- Do not hardcode the Gemini model name. Read it from `GEMINI_MODEL`, since free-tier models change.
- Never commit `.env`. Keep `.env.example` updated with variable names only.
- Do not send private or personal data to Gemini. Match stats only.
- Configure CORS to allow only the deployed frontend origin and local dev.

## Gemini usage
- Keep prompts short and structured to save tokens and stay inside free-tier limits.
- Request a consistent output format (for example 3 strengths, 3 weaknesses, 1 tip) so the UI can render it.
- If Gemini fails or is rate limited, still return the calculated stats and show a friendly "coaching unavailable" message.

## Testing
- Write unit tests for `stats.ts` (Vitest or Jest), including empty and partial match data.
- Mock HenrikDev and Gemini in tests. Never call real APIs in tests.

## Documentation and legal
- The README must include: setup steps, required environment variables, a screenshot or GIF, and this disclaimer: "This project is not affiliated with or endorsed by Riot Games. It uses an unofficial API for personal, non-commercial purposes."
- Describe the data source as "unofficial Valorant API (HenrikDev)". Never describe it as the "Riot API".
- No ads, payments, or paid features.

## Things to avoid
- Do not let the LLM calculate or estimate stats.
- Do not call external APIs from React components.
- Do not make external API calls inside loops without batching, caching and rate limiting.
- Do not add new dependencies without a clear reason.
