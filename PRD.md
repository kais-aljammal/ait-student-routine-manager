# AI Student Routine Manager - Product Requirements Document

## Product Overview and Goals
AI Student Routine Manager helps students convert daily constraints (wake/sleep, meals, classes, and fixed activities) into a clear timeline they can follow and track.  
Primary goals:
- Generate a usable day plan in seconds from user constraints.
- Keep schedule generation date-accurate and timezone-accurate.
- Provide a simple dashboard for execution, progress, and reminders.

## Problem Statement
Students often have fragmented schedules and struggle to convert fixed commitments into a realistic day timeline. Manual planning is time-consuming and inconsistent. Existing planners either require too much manual setup or generate unrealistic plans that ignore user constraints and local time context.

## Target Users / Personas
- **University student (primary):** Has classes, study blocks, meals, and commute constraints; needs fast daily planning.
- **Exam-focused student:** Wants strict routine structure and completion tracking.
- **Busy learner with side activities:** Needs conflict-free planning around non-academic fixed events.

## Core Features and User Flows
- **Authentication:** Sign up, sign in, and session-based access to private schedules.
- **Constraints onboarding:** Multi-step flow to collect wake/sleep, meals, and fixed activities.
- **Schedule generation:** Create tasks for a specific `schedule_date` (`YYYY-MM-DD`).
- **Date-aware dashboard:** View today, tomorrow, or custom date schedules.
- **Task progression:** Mark tasks complete and track progress.
- **Plan maintenance:** Regenerate or clear schedule for the selected date.
- **Optional notifications:** Store Telegram chat ID for reminder workflows.

### Main User Flow
1. User signs in.
2. User selects a target date from dashboard (today/tomorrow/custom).
3. User fills constraints and saves.
4. App generates and stores tasks for the selected date.
5. User returns to dashboard and sees tasks under that exact date.
6. User checks off tasks throughout the day.

## Functional Requirements
- FR-1: System must authenticate users before allowing schedule operations.
- FR-2: System must collect constraints and persist them per user.
- FR-3: System must generate tasks tied to a valid `schedule_date` in `YYYY-MM-DD`.
- FR-4: Dashboard must fetch/filter tasks by selected `schedule_date`.
- FR-5: Regenerate and clear actions must apply only to selected date.
- FR-6: Task completion updates must persist and reflect immediately in UI.
- FR-7: API must reject invalid date formats and unauthorized access.

## Non-Functional Requirements
- **Performance:** Typical dashboard fetch under 1s on local/broadband conditions.
- **Reliability:** Date mapping must remain stable across refresh/reopen.
- **Security:** No secret exposure in client; protected APIs require auth.
- **Data integrity:** Tasks must be stored with correct user/date association.
- **Timezone safety:** Date selection and rendering must avoid implicit date shifts.

## Success Metrics / KPIs
- Schedule generation success rate (% of requests returning valid task sets).
- Date-placement accuracy (tasks appear under requested `schedule_date`).
- Daily active users and returning users.
- Average tasks completed per generated schedule.
- Error rate for generation/task APIs (4xx/5xx trends).

## Milestones / Phases
- **Phase 1 (Done):** Auth, onboarding, generation pipeline, dashboard timeline.
- **Phase 2 (Done):** Date selection + strict selected-date placement consistency.
- **Phase 3:** Reminder reliability and notification UX improvements.
- **Phase 4:** Analytics, onboarding refinements, and deployment hardening.

## Risks and Assumptions
- AI provider latency/outages can affect generation responsiveness.
- Incorrect or missing timezone data can impact date expectations.
- External service limits (API quotas) can degrade generation availability.
- Assumes users provide coherent time ranges in constraints.

## Out of Scope
- Multi-day/week schedule optimization.
- Collaborative/shared planning.
- Native mobile apps.
- Advanced calendar sync integrations (Google/Apple) in current scope.

## Open Questions
- Should constraints be date-specific or remain generic defaults?
- Should users be allowed to generate for dates beyond tomorrow by default?
- What reminder retry policy should be used for failed Telegram sends?
- What free-tier limits are ideal for production scale/cost control?
