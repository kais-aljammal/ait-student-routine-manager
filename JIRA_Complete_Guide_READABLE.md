# AI Student Routine Manager
## Complete JIRA Project Setup Guide

For Teammates - Project Management Course (Spring 2025-2026)

---

## Introduction

This document is a readable version of the JIRA guide content from your `docx` script.
Use it as the source-of-truth checklist to create and organize the project in JIRA.

Project overview:
- **Name:** AI Student Routine Manager
- **Type:** Full-stack web application
- **Purpose:** Students input class schedules and habits; AI generates realistic gap-free daily routines.
- **Stack:** Next.js, Tailwind, Supabase, Claude (primary), Gemini/OpenRouter/Groq fallbacks, Vercel, Telegram Bot API
- **Constraint:** Free tiers only

### What to write in your report
- Write 1 short paragraph introducing the project goal and who the users are.
- Explain the problem solved: students struggle to plan realistic daily schedules.
- Explain the solution: AI-assisted routine generation plus progress tracking and reminders.
- Mention constraints: free-tier services, semester deadline, team-based development.

### What to add in JIRA
- Project name and key exactly: `AI Student Routine Manager (ASRM)`.
- Project description (copy this):
  - "A full-stack web app that builds realistic daily student routines from class schedules and habits, with AI generation, dashboard tracking, and Telegram reminders."

---

## Section 1 - Project Type: Scrum

Select **Scrum** (not Kanban) because the project has:
- A fixed semester deadline (14 weeks)
- Clear scope and defined backlog
- Time-boxed delivery in sprints
- Formal roles and review cycles

Scrum points to mention in report:
- Fixed-length sprints
- Prioritized product backlog
- Sprint planning, review, retrospective
- Acceptance criteria per story
- Story point estimation (Fibonacci)

### What to write in your report
- Add a heading: **Why we selected Scrum**.
- Write 5-7 sentences covering:
  - Fixed 14-week deadline
  - Defined scope from start
  - Work split into 4 sprints
  - Roles and ceremonies
  - Need to inspect/adapt each sprint
- Add one comparison sentence: Kanban is less suitable for fixed-semester scope/deadline.

### What to add in JIRA
- During project creation, choose **Scrum template**.
- Confirm **Team-managed project**.
- Set sprint cadence to 2-3 weeks.

---

## Section 2 - JIRA Setup Steps

1. Create JIRA account at `jira.atlassian.com`
2. Create project:
   - Template: **Scrum**
   - Name: **AI Student Routine Manager**
   - Key: **ASRM**
   - Type: **Team-managed**
3. Assign roles:
   - Product Owner
   - Scrum Master
   - Developers
4. Create sprints:
   - Sprint 1: Foundation (Weeks 1-3)
   - Sprint 2: AI Core (Weeks 4-7)
   - Sprint 3: Dashboard & Alerts (Weeks 8-11)
   - Sprint 4: Deployment & Polish (Weeks 12-14)

### What to write in your report
- Add subsection: **JIRA Project Configuration**.
- Include:
  - Account creation summary
  - Project template + key choice
  - Team roles and responsibilities
  - Sprint names and date ranges
- Add 1 screenshot reference for project settings and 1 for backlog with sprints.

### What to add in JIRA
- Add members and map:
  - Product Owner (backlog prioritization)
  - Scrum Master (facilitation/blockers)
  - Developers (implementation)
- Create all 4 sprints in backlog before creating issues.
- Keep sprint names exactly as listed above.

---

## Section 3 - Epics

Create these 6 epics:
1. **ASRM-E1** User Authentication & Account Management
2. **ASRM-E2** 9-Screen Onboarding Questionnaire
3. **ASRM-E3** AI Schedule Generation Engine
4. **ASRM-E4** Interactive Dashboard & Timeline
5. **ASRM-E5** Telegram Notification System
6. **ASRM-E6** Deployment, Performance & Production Setup

### What to write in your report
- Add subsection: **Epic Breakdown**.
- For each epic, write:
  - 1 sentence objective
  - Why it is important
  - Which sprint(s) mainly cover it
- Mention that epics are containers and stories/tasks are planned into sprints.

### What to add in JIRA
- Create 6 epic issues with IDs/titles above.
- In each epic description add:
  - Goal
  - Scope boundaries (what is included/excluded)
  - Related sprint window
- Optional: apply distinct epic colors for readability.

---

## Section 4 - Stories (ASRM-1 to ASRM-20)

Story groups:
- **Authentication:** ASRM-1, ASRM-2, ASRM-3
- **Onboarding:** ASRM-4, ASRM-5, ASRM-6, ASRM-7
- **AI Engine:** ASRM-8, ASRM-9, ASRM-10, ASRM-11
- **Dashboard:** ASRM-12, ASRM-13, ASRM-14, ASRM-15
- **Telegram:** ASRM-16, ASRM-17
- **Deployment:** ASRM-18, ASRM-19, ASRM-20

Each story should include:
- Summary
- User story statement
- Acceptance criteria
- Priority
- Story points
- Epic link
- Sprint

### What to write in your report
- Add subsection: **User Stories and Value Delivery**.
- Explain story format:
  - "As a [user], I want [action], so that [benefit]."
- For each epic, summarize 2-4 key stories and expected user value.
- Add note that acceptance criteria define "done".

### What to add in JIRA
- For each story, complete these fields:
  - Summary
  - Description (full user story + acceptance criteria)
  - Priority
  - Story points
  - Epic link
  - Sprint
- Keep naming/numbering exactly `ASRM-1` to `ASRM-20`.
- Use acceptance criteria checklist style to make validation easier.

### Copy-ready story description template
- User Story:
  - "As a [role], I want [feature], so that [value]."
- Acceptance Criteria:
  - [ ] Criterion 1
  - [ ] Criterion 2
  - [ ] Criterion 3
- Notes:
  - Dependencies:
  - Edge cases:

---

## Section 5 - Tasks

Tasks are linked technical actions under stories.
Examples in your original script include detailed task sets under:
- ASRM-1 (Sign-Up)
- ASRM-2 (Sign-In)
- ASRM-3 (Route Protection)
- ASRM-8 (Pre-computation)
- ASRM-9 (AI Fallback Chain)
- ASRM-12 (Timeline UI)
- ASRM-17 (Telegram Alerts)

### What to write in your report
- Add subsection: **Task Decomposition**.
- Explain that tasks are technical implementation units under stories.
- Mention each task has owner, points, and status.
- Give one example of decomposition (for example ASRM-8 precompute tasks).

### What to add in JIRA
- For each story, add child tasks using clear action verbs:
  - Configure / Implement / Validate / Test / Refactor
- Fill task fields:
  - Summary
  - Parent story link
  - Assignee
  - Story points
  - Status
- Keep task IDs/names consistent with your guide tables.

### Copy-ready task template
- Task Summary: "[Verb] [component/feature]"
- Description:
  - Technical objective:
  - Steps:
  - Definition of done:

---

## Section 6 - Bugs

Create and document these bugs:
- **ASRM-B1:** Gemini model deprecation issue
- **ASRM-B2:** Dashboard rendered unstyled
- **ASRM-B3:** Runtime `Error: [object Event]`
- **ASRM-B4:** Illogical AI schedule generation
- **ASRM-B5:** Windows npm execution policy issue
- **ASRM-B6:** Onboarding data shape mismatch

Each bug should include:
- Steps to reproduce
- Expected result
- Actual result
- Root cause
- Fix applied
- Files changed
- Priority, points, status, sprint

### What to write in your report
- Add subsection: **Defect Tracking and Resolution**.
- Explain bug lifecycle:
  - Discovery -> Reproduction -> Root cause -> Fix -> Verification
- Mention that each bug ticket includes evidence and fix documentation.
- Briefly highlight high-impact bugs (B1, B2, B4) and lessons learned.

### What to add in JIRA
- Create bug tickets `ASRM-B1` to `ASRM-B6`.
- Use structured description blocks:
  - Steps to reproduce
  - Expected result
  - Actual result
  - Root cause
  - Fix applied
  - Files changed
- Set priority, points, sprint, and final status.

### Copy-ready bug template
- Steps to reproduce:
  1.
  2.
  3.
- Expected result:
- Actual result:
- Root cause:
- Fix applied:
- Files changed:
- Verification result:

---

## Section 7 - Sprint Summary

- **Sprint 1:** 21 points
- **Sprint 2:** 39 points
- **Sprint 3:** 26 points
- **Sprint 4:** 10 points
- **Grand total:** 96 points

### What to write in your report
- Add subsection: **Sprint Plan and Workload Distribution**.
- Include a short paragraph per sprint:
  - Main focus
  - Key stories/bugs
  - Total points
- Add a final sentence interpreting workload balance across the semester.

### What to add in JIRA
- Confirm each story/bug is assigned to the correct sprint.
- Ensure sprint point totals match this section.
- Start Sprint 1 with correct date range; keep later sprints planned.

---

## Section 8 - Teammate Checklist

1. Setup account and project
2. Create 4 sprints
3. Create 6 epics
4. Create all stories
5. Create all tasks
6. Create all bugs
7. Start Sprint 1
8. Capture required screenshots for report appendix

### What to write in your report
- Add subsection: **Execution Checklist Followed by Team**.
- State that all setup and issue creation steps were completed in sequence.
- Add screenshot index list (caption + what each screenshot proves).

### What to add in JIRA / Evidence folder
- Capture and store screenshots for:
  - Project home + members
  - Roadmap (all epics)
  - Backlog (all sprints)
  - Story details (criteria, points, epic link)
  - Task list under a story
  - Bug details
  - Active sprint board

---

## Section 9 - Glossary

Include definitions for:
- Epic
- Story
- Task
- Bug
- Subtask
- Sprint
- Backlog
- Story Points
- Acceptance Criteria
- Product Owner
- Scrum Master
- Sprint Planning
- Sprint Review
- Burndown Chart
- Epic Link

### What to write in your report
- Put this as an appendix/subsection named **Glossary of Agile/JIRA Terms**.
- Keep each definition to 1-2 lines max.
- Use consistent plain language (avoid tool jargon overload).

### What to add in JIRA context
- No new issues needed here.
- Ensure terms used in tickets match glossary wording (Epic, Story, Task, Bug, Story Points, Acceptance Criteria).

---

## Optional: Generate `.docx` from your original script

You already have the full `docx` builder code. To generate a Word file directly in this repo:

1. Save your JS as `scripts/generate-jira-guide.js`
2. Ensure dependency is installed:
   - `npm install docx`
3. Update output path in script to:
   - `./JIRA_Complete_Guide.docx`
4. Run:
   - `node scripts/generate-jira-guide.js`

## Final submission pack (recommended)

Include these files in your final handoff:
- `JIRA_Complete_Guide_READABLE.md` (editable source)
- `JIRA_Complete_Guide_READABLE.docx` (report-ready)
- Screenshot folder:
  - `01_project_setup.png`
  - `02_sprints_backlog.png`
  - `03_epics_roadmap.png`
  - `04_stories_backlog.png`
  - `05_tasks_under_story.png`
  - `06_bug_ticket.png`
  - `07_active_sprint_board.png`

Optional additions for higher quality:
- Team role matrix (name -> role -> responsibility)
- Risk list (top 3 risks + mitigation)
- Definition of Done checklist used by team

