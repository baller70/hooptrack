# hooptrack — Architecture

> Auto-generated 2026-06-10 21:19 UTC from brain.db structural extraction (`extract-structure.py` → `mem_app_*`). Division: **tbf**. Regenerate via `/tmp/gen-architecture.py`. Edit prose freely; counts refresh on regen.

## At a glance

| Routes | API endpoints | DB tables | Components | Functions | Env vars | Packages | Workflows |
|---|---|---|---|---|---|---|---|
| 23 | 66 | 0 | 61 | 3058 | 35 | 45 | 12 |

## Deploy / runtime

- pm2-ecosystem — port 4008 — node_modules/.bin/next
- package-scripts — next start

## Pages / routes (23)

- `/`
- `/dashboard/activity`
- `/dashboard/calendar`
- `/dashboard/chat`
- `/dashboard/classroom`
- `/dashboard/classroom/:id` *(dynamic)*
- `/dashboard/classroom/create`
- `/dashboard/comparison`
- `/dashboard/me`
- `/dashboard/moves`
- `/dashboard/moves/create`
- `/dashboard/moves/upload`
- `/dashboard/notifications`
- `/dashboard/players`
- `/dashboard/players/:id` *(dynamic)*
- `/dashboard/profile`
- `/dashboard/progress`
- `/dashboard/record`
- `/dashboard/workouts`
- `/dashboard/workouts/:id` *(dynamic)*
- `/dashboard/workouts/create`
- `/login`
- `/register`

## API endpoints (66)

- `GET    /api/activity`
- `POST   /api/ai/feedback`
- `POST   /api/ai/inspiration`
- `POST   /api/ai/moves`
- `GET    /api/ai/progress`
- `POST   /api/ai/quiz`
- `POST   /api/ai/workout`
- `POST   /api/auth/login`
- `POST   /api/auth/logout`
- `GET    /api/auth/me`
- `POST   /api/auth/register`
- `DELETE /api/auth/view-as`
- `POST   /api/auth/view-as`
- `DELETE /api/drills`
- `POST   /api/drills`
- `PUT    /api/drills`
- `GET    /api/drills/free-play`
- `GET    /api/drills/options`
- `GET    /api/messages`
- `POST   /api/messages`
- `GET    /api/messages/:id/attachment`
- `GET    /api/messages/thread`
- `POST   /api/messages/thread`
- `GET    /api/moves`
- `POST   /api/moves`
- `DELETE /api/moves/:id`
- `PUT    /api/moves/:id`
- `POST   /api/moves/upload`
- `GET    /api/notifications`
- `POST   /api/notifications`
- `PUT    /api/notifications/:id/read`
- `POST   /api/notifications/mark-all-read`
- `GET    /api/notifications/unread-count`
- `GET    /api/players`
- `GET    /api/players/:id/activity`
- `GET    /api/progress/report`
- `DELETE /api/push/subscribe`
- `POST   /api/push/subscribe`
- `GET    /api/quizzes`
- `POST   /api/quizzes`
- `DELETE /api/quizzes/:id`
- `GET    /api/quizzes/:id`
- `PUT    /api/quizzes/:id`
- `POST   /api/quizzes/:id/attempt`
- `GET    /api/recordings`
- `POST   /api/recordings`
- `DELETE /api/recordings/:id`
- `PUT    /api/recordings/:id`
- `POST   /api/recordings/:id/clip`
- `GET    /api/recordings/:id/video`
- `POST   /api/recordings/upload`
- `GET    /api/schedule`
- `POST   /api/schedule`
- `DELETE /api/schedule/:id`
- `PUT    /api/schedule/:id`
- `GET    /api/users/all-players`
- `GET    /api/users/contacts`
- `GET    /api/users/settings`
- `PUT    /api/users/settings`
- `GET    /api/workouts`
- `POST   /api/workouts`
- `DELETE /api/workouts/:id`
- `GET    /api/workouts/:id`
- `PUT    /api/workouts/:id`
- `POST   /api/workouts/:id/duplicate`
- `GET    /api/youtube/search`

## Environment variables (35)

`ATTACHMENTS_DIR`, `DEBUG`, `ECE_KEYLOG`, `HOOPTRACK_DB`, `JWT_SECRET`, `NEXT_DEBUG_BUILD`, `NEXT_OTEL_FETCH_DISABLED`, `NEXT_OTEL_PERFORMANCE_PREFIX`, `NEXT_OTEL_VERBOSE`, `NEXT_PHASE`, `NEXT_PRIVATE_DEBUG_CACHE`, `NEXT_PRIVATE_RESPONSE_CACHE_MAX_SIZE`, `NEXT_PRIVATE_RESPONSE_CACHE_TTL`, `NEXT_PRIVATE_TEST_PROXY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `NEXT_SSG_FETCH_METRICS`, `NODE_ENV`, `PORT`, `RECORDINGS_DIR`, `TURBOPACK`, `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_SUBJECT`, `VERCEL`, `VERCEL_BRANCH_URL`, `VERCEL_ENV`, `VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_URL`, `__NEXT_BUILD_ID`, `__NEXT_EXPERIMENTAL_HTTPS`, `__NEXT_PREVIEW_MODE_ENCRYPTION_KEY`, `__NEXT_PREVIEW_MODE_ID`, `__NEXT_PREVIEW_MODE_SIGNING_KEY`, `__NEXT_TEST_MAX_ISR_CACHE`, `__NEXT_VERBOSE_LOGGING`

## Key dependencies (prod)

`@base-ui/react@^1.4.1`, `@dnd-kit/core@^6.3.1`, `@dnd-kit/sortable@^10.0.0`, `@dnd-kit/utilities@^3.2.2`, `@ducanh2912/next-pwa@^10.2.9`, `@fullcalendar/core@^6.1.20`, `@fullcalendar/daygrid@^6.1.20`, `@fullcalendar/interaction@^6.1.20`, `@fullcalendar/react@^6.1.20`, `@hookform/resolvers@^5.2.2`, `bcryptjs@^3.0.3`, `better-sqlite3@^12.9.0`, `class-variance-authority@^0.7.1`, `clsx@^2.1.1`, `cookies-next@^6.1.1`, `date-fns@^4.1.0`, `framer-motion@^12.38.0`, `idb@^8.0.3`, `jose@^6.2.3`, `lucide-react@^1.14.0`, `next@16.2.4`, `react@19.2.4`, `react-dom@19.2.4`, `react-hook-form@^7.75.0`, `react-player@^3.4.0`, `recharts@^3.8.1`, `shadcn@^4.7.0`, `sonner@^2.0.7`, `tailwind-merge@^3.5.0`, `tw-animate-css@^1.4.0`, `web-push@^3.6.7`, `zod@^4.4.3`

