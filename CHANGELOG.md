# Changelog

All notable changes to **HoopTrack** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Project `CHANGELOG.md` following the Keep a Changelog format.
- `description`, `license`, and `author` fields in `package.json`.

## [0.1.0] - 2026-05-15

### Added
- Initial release of HoopTrack — a basketball tracking application for managing players, sessions, drills, and progress.
- Next.js 16 App Router project on React 19 with TypeScript 5.
- Tailwind CSS 4 styling with shadcn/ui components and `tw-animate-css` utilities.
- PWA support via `@ducanh2912/next-pwa` with offline IndexedDB caching (`idb`).
- Web push notifications using `web-push` and VAPID keys.
- Server-side storage with `better-sqlite3`; client-side persistence with IndexedDB.
- Authentication using `jose` (JWT) with `bcryptjs` password hashing and `cookies-next` session cookies.
- Drag-and-drop interactions via `@dnd-kit`.
- Scheduling and calendar views with FullCalendar.
- Analytics and charting via Recharts.
- Form handling with `react-hook-form` + `zod` validation.
- PM2 process management via `ecosystem.config.js` (port `4008`).

[Unreleased]: https://example.com/hooptrack/compare/v0.1.0...HEAD
[0.1.0]: https://example.com/hooptrack/releases/tag/v0.1.0
