# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

Keep the four stages as 课前测评（素养测评与调查问卷）, 理论学习及测评, 实操考核, and 智能选学及课程反馈. Put videos, lesson notes, course chapters, and question-bank practice under theory learning. Keep the digital study companion available from the student interface without navigating away from the current lesson.

Chaoxing login reuses the existing authentication center's one-time ticket protocol through a Supabase Edge Function. Keep verification secrets server-side and bind verified fid/uid to administrator-managed course accounts and classes.

Show pre-assessment as a first-entry modal for each student and trade. A successfully persisted assessment is the completion state. Keep completed results read-only and skip future automatic prompts, including after a cloud account signs in on another device.

Allow dismissing the assessment by clicking outside, closing, or Escape. Keep an unsubmitted per-student/per-trade draft in the current browser and restore it from the assessment entry. Dismissal is separate from successful submission and must not mark the assessment complete.
