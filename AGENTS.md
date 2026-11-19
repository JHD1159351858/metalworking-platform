# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

Keep the four stages as 课前测评（素养测评与调查问卷）, 理论学习及测评, 实操考核, and 智能选学及课程反馈. Put videos, lesson notes, course chapters, and question-bank practice under theory learning. Keep the digital study companion available from the student interface without navigating away from the current lesson.
Show the signed-in student's recorded progress for each of these four stages in the learning center, scoped to the selected trade.
Include a personal mistake notebook in learning records. Keep errors and corrections traceable to the actual question, and recommend specific related practice questions from the student bank.
Integrate Chaoxing teaching activities into theory, practical work and elective study within the four existing stages. The stepped-shaft example and independent drills are freely accessible, and both keep their own learning evidence. Keep observed Chaoxing chapter and teaching-design metadata distinct from locally authored summaries, practice questions and tasks. Preserve official course resource access and avoid treating chapter drills as practical eligibility.
Number the CNC learning units within the CNC course. Keep original Chaoxing section numbers in source citations and stable record keys.
Give each CNC unit its own foundational reading and separate case practice. On desktop, students can ask the study companion questions alongside their theory work.
Illustrate each CNC unit with a labeled, learner-controlled demonstration of that unit's example.
Use the original blue-and-white palette across all modules, including the question bank, records, and teacher workspace. Make the selected chapter prominent, link the trade breadcrumb to its course homepage, and keep prototype commentary out of learning screens.
Use a light blue chapter directory. Each CNC chapter has a 100-question practice bank in the knowledge library; draw ten distinct questions per round. Keep formal assessment answers out of the practice library. Show a dimensioned drawing in the practical assessment.

Local Chaoxing login verifies the authentication center's one-time ticket in the development server. Independent Supabase deployments verify tickets in an Edge Function and bind verified fid/uid to administrator-managed course accounts and classes. Keep all verification secrets server-side.

Show pre-assessment as a first-entry modal for each student and trade. A successfully persisted assessment is the completion state. Keep completed results read-only and skip future automatic prompts, including after a cloud account signs in on another device.

Allow dismissing the assessment by clicking outside, closing, or Escape. Keep an unsubmitted per-student/per-trade draft in the current browser and restore it from the assessment entry. Dismissal is separate from successful submission and must not mark the assessment complete.

The teacher workspace opens to class-level learning metrics and a searchable student roster with individual records. In cloud mode, require an authorized teacher account and an additional server-verified teacher password before reading class data. Show the available data scope when learning records are stored locally.

The public homepage opens in guest mode with a brief startup animation. Homepage buttons prompt visitors to log in. The dialog offers Chaoxing login and a separate teacher-password entry.
Use the same homepage layout and proportions for visitors and signed-in students. Access controls and personal progress should follow the current login state.
Student access requires a verified Chaoxing identity or an authenticated course account.
