# Why Fired

A platform for people to document, understand, and share why they were
let go from a job; and to see the patterns across other people's
experiences. Stories can be posted anonymously or, once approved,
alongside an official response.

**Live app:** whyfired.com

## What it does

- **Share a case** — a structured form (role, employer size, what
  happened, whether notice/severance or a disciplinary process was
  followed) plus a free-text story.
- **Review queue** — every submission is reviewed by an admin before
  it becomes public, and assigned a category for browsing.
- **Feed** — approved stories, with upvoting and threaded comments.
- **Patterns** — an aggregate, anonymized breakdown of *why* people
  report being let go, shown only once there's enough volume to keep
  individual cases from being identifiable.
- **Official responses** — case owners and admins can post
  organization-verified replies on a case or comment.
- **Support** — a lightweight way for readers to tip the project
  directly via UPI (India), no payment processor involved.

## Tech stack

- **Frontend:** React 19 + TypeScript, React Router, Tailwind CSS,
  built with Vite.
- **Backend:** Supabase; Postgres (with row-level security), Auth
  (Google / LinkedIn OAuth), and Edge Functions (Deno) for anything
  that needs server-side validation before touching the database.

## Project structure

```
src/
  components/   Shared UI: feed post/list, navbar, footer, notification bell, etc.
  pages/        One file per route (Home, ShareCase, Stories, CaseDetail, Admin*, ...)
  lib/          Supabase client, auth context, small shared helpers
supabase/
  functions/    Edge functions — one folder per function, each with its own index.ts
```

Routing lives in `src/App.tsx`. Most write actions (submitting a case,
posting a comment) go through an edge function rather than a direct
table insert, so validation and moderation checks run in one place
before anything reaches the database.

## Running locally

```bash
npm install
npm run dev
```

You'll need your own Supabase project, with the schema and edge
functions in this repo deployed to it, and the relevant environment
variables set (Supabase URL/anon key for the frontend; provider
credentials and secrets for anything the edge functions call out to).
This repo does not include database migrations or secrets; those are
managed directly against the Supabase project, not committed here.

## Contributing

This is currently run as a single-maintainer project. If you spot a
bug or have an idea, opening an issue is the best way to start a
conversation before sending a pull request.