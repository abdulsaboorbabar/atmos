# ATMOS Push Notification Implementation Plan

## 1. Scope and constraints

This project is a static PWA frontend with an existing offline service worker and no backend scaffold. A production push system must therefore be added in a way that preserves the current app architecture:

- Keep the current React/Vite/PWA structure.
- Preserve the existing offline service worker and PWA caching.
- Do not rebuild ATMOS as a native app.
- Use Firebase Cloud Messaging (FCM) for web push.
- Use Supabase PostgreSQL for device subscriptions and preferences.
- Use a backend scheduler for all notification delivery logic.
- Do not rely on browser timers or browser-open state.

This document is an implementation blueprint. A real end-to-end push test cannot be completed from this workspace alone because it requires a live Firebase project, Supabase project, secure backend, and a real mobile or desktop browser with permission flow.

---

## 2. Recommended architecture

### Runtime flow

1. ATMOS frontend requests browser notification permission only after explicit user action.
2. Frontend registers the service worker and obtains an FCM token.
3. Browser sends the token to the backend API.
4. Backend stores the device subscription in Supabase.
5. Scheduler runs every 30 minutes and checks active locations.
6. Open-Meteo forecast data is cached by location and evaluated by `weatherEventDetector`.
7. Matching notifications are filtered by user preferences, quiet hours, and deduplication state.
8. Backend sends FCM messages to subscribed devices.
9. Notification history is stored for dedupe and auditing.

### Components

- Frontend: existing ATMOS React app
- Service worker: existing [atmos-main/sw.js](atmos-main/sw.js)
- Notification UI: settings page additions in the frontend app
- Firebase: web push, messaging SDK, admin SDK
- Supabase: subscription table, preferences, history, scheduler access
- Backend API: serverless functions or secure app routes
- Weather provider: Open-Meteo
- Scheduler: managed cron / scheduled job every 30 minutes

---

## 3. Existing app integration points

### Frontend entry points

The existing app already loads a root service worker and a boot HTML shell:

- [atmos-main/index.html](atmos-main/index.html)
- [atmos-main/sw.js](atmos-main/sw.js)
- [atmos-main/atmos-offline.js](atmos-main/atmos-offline.js)

### Required frontend additions

Add a notification settings section to the settings page of the existing app, using the current UI patterns already present in the bundle.

Recommended frontend files to add or extend:

- `src/features/notifications/NotificationSettings.tsx`
- `src/features/notifications/fcm.ts`
- `src/features/notifications/useNotificationPreferences.ts`
- `src/features/notifications/permission.ts`

If the app remains as a single static bundle in this workspace, these can be created as plain JS modules and loaded by the existing app shell after the current React bundle is rebuilt.

---

## 4. Service worker integration plan

### Important rule
The existing background service worker must remain the active root-scope worker. Do not replace it with a second worker.

### Required design

- Preserve all current offline caching and weather caching logic in [atmos-main/sw.js](atmos-main/sw.js).
- Register Firebase Messaging in the same service worker, not as a separate root worker.
- Add a dedicated notification click handler to open the proper ATMOS page and city context.
- Keep foreground notification handling separate from background notification handling to avoid duplicate displays.

### Service worker responsibilities

- Handle `push` events from Firebase.
- Display notification via `self.registration.showNotification`.
- Handle `notificationclick` events.
- Maintain offline cache behavior and app shell fallback.
- Never block or replace PWA functionality.

### Example service worker event pattern

```js
self.addEventListener('push', (event) => {
  const payload = event.data && event.data.json();
  if (!payload) return;

  const { title, body, data } = payload;
  const notificationOptions = {
    body,
    icon: '/icon.png',
    badge: '/icon.png',
    data,
    tag: data?.eventId || 'atmos-notification'
  };

  event.waitUntil(
    self.registration.showNotification(title, notificationOptions)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.openWindow(url)
  );
});
```

---

## 5. Firebase configuration

### Required Firebase setup

1. Create a Firebase project for ATMOS.
2. Enable Cloud Messaging.
3. Add a web app configuration.
4. Generate a VAPID public key.
5. Configure the web app using the supported Firebase JS SDK flow.
6. Add Firebase Admin SDK to the backend only.

### Required frontend environment variables

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_VAPID_KEY=...
```

### Required backend environment variables

```env
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_DATABASE_URL=...
FCM_SERVER_KEY=...
```

### Security requirements

- Never expose private keys in frontend JavaScript.
- Keep Firebase Admin credentials only in backend/server-side config.
- Use HTTPS only.
- Validate all requests that trigger notifications.

---

## 6. Database design and schema

### Supabase PostgreSQL tables

```sql
create extension if not exists pgcrypto;

create table if not exists notification_subscriptions (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  fcm_token text not null,
  user_id uuid null,
  location_name text not null,
  latitude double precision not null,
  longitude double precision not null,
  timezone text not null default 'Asia/Karachi',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique(device_id, fcm_token)
);

create index if not exists idx_notification_subscriptions_active
  on notification_subscriptions (is_active, last_seen_at);

create table if not exists notification_preferences (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references notification_subscriptions(id) on delete cascade,
  morning_enabled boolean not null default true,
  morning_time time not null default '07:00:00',
  evening_enabled boolean not null default true,
  evening_time time not null default '19:00:00',
  rain_enabled boolean not null default true,
  heavy_rain_enabled boolean not null default true,
  thunderstorm_enabled boolean not null default true,
  snow_enabled boolean not null default false,
  wind_enabled boolean not null default true,
  heat_enabled boolean not null default true,
  cold_enabled boolean not null default true,
  fog_enabled boolean not null default true,
  air_quality_enabled boolean not null default true,
  official_alerts_enabled boolean not null default false,
  quiet_hours_enabled boolean not null default true,
  quiet_start time not null default '22:00:00',
  quiet_end time not null default '07:00:00',
  critical_alerts_override_quiet_hours boolean not null default false,
  max_event_notifications_per_day integer not null default 4,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(subscription_id)
);

create table if not exists notification_history (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references notification_subscriptions(id) on delete cascade,
  notification_type text not null,
  event_id text null,
  title text not null,
  message text not null,
  severity text not null default 'info',
  scheduled_at timestamptz null,
  sent_at timestamptz not null default now(),
  delivery_status text not null default 'sent',
  provider_response jsonb null,
  created_at timestamptz not null default now()
);

create index if not exists idx_notification_history_subscription_time
  on notification_history (subscription_id, sent_at desc);

create table if not exists weather_events (
  id uuid primary key default gen_random_uuid(),
  location_key text not null,
  event_type text not null,
  severity text not null,
  event_start timestamptz not null,
  event_end timestamptz null,
  first_detected_at timestamptz not null default now(),
  last_checked_at timestamptz not null default now(),
  last_notified_at timestamptz null,
  event_status text not null default 'active',
  event_fingerprint text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_weather_events_location_key
  on weather_events (location_key, event_status, event_start);

create index if not exists idx_weather_events_fingerprint
  on weather_events (event_fingerprint, event_status, last_notified_at);
```

### RLS and access guidance

- Use Supabase Row Level Security with service-role access only on backend.
- Public frontend requests should never have direct write access to the full tables.
- Use server-side API route protection and scheduled job authentication.

---

## 7. Backend API endpoints

### Required endpoints

- `POST /api/notifications/register`
- `POST /api/notifications/preferences`
- `POST /api/notifications/unsubscribe`
- `POST /api/notifications/test`
- `GET /api/notifications/status`
- `GET /api/cron/daily-briefings`
- `GET /api/cron/weather-events`
- `GET /api/cron/cleanup`

### Protection requirements

- Validate body schema and coordinates.
- Require secure API keys or signed cron tokens.
- Rate-limit public endpoints.
- Never allow anonymous public requests to broadcast to all devices.

### Example contract for registration

```json
{
  "deviceId": "abc-123",
  "fcmToken": "token",
  "locationName": "Islamabad",
  "latitude": 33.6844,
  "longitude": 73.0479,
  "timezone": "Asia/Karachi",
  "permissionState": "granted"
}
```

---

## 8. Weather event detector

Create a dedicated module named `weatherEventDetector`.

### Purpose

This module evaluates hourly forecast data and returns structured events for each subscribed location.

### Detection defaults

#### Rain
- Probable when precipitation probability >= 70%
- 3-hour precipitation >= 5 mm
- Heavy rain if 3-hour precipitation >= 15 mm

#### Thunderstorms
- Detect thunderstorm conditions with elevated rain and lightning-related weather codes, where available.
- Higher priority than ordinary rain.

#### Snow
- Use weather condition codes and snowfall variables where available.
- Do not trigger from cold temperature alone.

#### Strong winds
- Wind speed >= 40 km/h OR wind gusts >= 55 km/h
- Severe: gusts >= 75 km/h

#### Extreme heat
- Max temperature >= 40°C
- Higher threshold for severe heat

#### Extreme cold / frost risk
- Min temperature <= 3°C
- Use forecast conditions and frost risk only when supported by the data

#### Fog / low visibility
- Trigger only when visibility or weather conditions support it

#### Air quality
- Use AQI/PM2.5/PM10/Ozone values if enabled by the user
- Tag as forecast-modelled air quality, not official monitoring data

#### Official warnings
- Only classify as official when from a verified official source such as PMD or an eligible official feed
- Do not present ATMOS-generated forecasts as official alarms

### Example event structure

```js
{
  id: 'locationId:eventType:forecastStart',
  locationKey: '33.6844,73.0479',
  eventType: 'rain',
  severity: 'moderate',
  start: '2026-11-11T13:00:00+05:00',
  end: '2026-11-11T16:00:00+05:00',
  message: 'Rain approaching in Islamabad within 2 hours.',
  source: 'forecast-model',
  fingerprint: 'locationKey:eventType:start:end'
}
```

---

## 9. Notification deduplication and frequency rules

### Event identity

Use:

```text
location_id + event_type + forecast_start_time
```

### Required rules

1. Trigger only on first detection.
2. Do not resend the same event every forecast refresh.
3. If severity rises, send an escalation message.
4. If the event ends, do not send a cancellation unless the user opts in.
5. Keep event history.
6. Re-trigger after the event has ended and a new one begins.
7. Default cooldown: 6 hours for the same event.
8. Severe official warnings may bypass ordinary cooldown rules.
9. Limit ordinary event alerts to 4 per day per device, unless the user chooses otherwise or a severe event requires escalation.

### Suggested notification logic

```js
function shouldSendEvent({ priorEvent, newEvent, cooldownMs, recentCount, severity }) {
  if (priorEvent && (new Date() - new Date(priorEvent.last_notified_at)) < cooldownMs) {
    return false;
  }

  if (recentCount >= 4 && severity !== 'severe') {
    return false;
  }

  return true;
}
```

---

## 10. Daily briefing design

### Morning briefing

- Default time: 07:00 AM in the user's timezone.
- Send one daily summary with today’s weather.
- Include: current temperature, max/min, condition, rain chance, expected rainfall if meaningful, wind, UV, AQI if enabled, practical recommendation.

### Evening briefing

- Default time: 07:00 PM.
- Summarize tonight and tomorrow.
- Include overnight and next-day outlook.

### Default timezone

- Default timezone for Pakistan users: `Asia/Karachi`.
- For each device, store timezone and respect it in backend processing.

---

## 11. Quiet hours and user controls

### Default quiet hours

- 10:00 PM to 7:00 AM

### User settings

- Morning briefing on/off
- Evening briefing on/off
- Event categories on/off
- Quiet hours on/off
- Critical alerts override quiet hours
- Notification location override
- Manual location change

### Important rule
Morning and evening briefing times must still be honored if the user explicitly configured them, even during quiet hours.

---

## 12. Weather data efficiency and grouping

### Data request strategy

- Group subscriptions by rounded latitude/longitude or location key.
- Fetch forecast data once per location group, not once per user.
- Cache responses by location for 20–30 minutes.
- Use only relevant fields:
  - temperature_2m
  - apparent_temperature
  - precipitation_probability
  - precipitation
  - rain
  - snowfall
  - weather_code
  - wind_speed_10m
  - wind_gusts_10m
  - visibility
  - uv_index
  - relative_humidity_2m

### Handling failures safely

- Do not interpret missing precipitation as zero.
- Do not raise alerts on stale or incomplete forecast data.
- Respect API rate limits.
- Fail safely when data is unavailable.

---

## 13. Delivery and scheduler requirements

### Browser cannot schedule reliably

The browser cannot be trusted to keep notifications scheduled after the website is closed.

### Backend processing requirement

A reliable scheduler must run every 30 minutes and process:

1. active subscriptions
2. due daily briefings
3. weather-event detection
4. deduplication
5. FCM delivery
6. result logging

### Supported job options

- Vercel Pro cron
- Supabase scheduled jobs / edge jobs
- another managed 30-minute scheduler

### Important note
Vercel Hobby cron is not sufficient for a 30-minute weather-event monitor.

---

## 14. Message content standards

Every message should be short and actionable.

Examples:

- Morning: `Good morning – Islamabad` / `30°C today, mostly sunny. Rain unlikely. Moderate winds.`
- Evening: `Tomorrow's weather – Rawalpindi` / `32°C tomorrow. Rain possible after 5 PM. Winds may strengthen in the evening.`
- Rain: `Rain approaching – Rawalpindi` / `Rain expected within 2 hours. Carry an umbrella.`
- Thunderstorm: `Thunderstorm warning – Rawalpindi` / `Thunderstorms forecast nearby. Avoid exposed outdoor areas.`
- Strong winds: `Strong winds expected` / `Wind gusts may reach 65 km/h this afternoon.`
- Heat: `Heat alert – Rawalpindi` / `Temperature may reach 42°C tomorrow. Avoid prolonged outdoor exposure.`
- Fog: `Fog expected tomorrow` / `Visibility may be reduced during the morning commute.`

Do not label a forecast alert as an official warning unless it is from a verified official source.

---

## 15. Reliability and security checklist

- Firebase Admin credentials remain server-side only.
- Setup request validation.
- Rate-limit endpoints.
- Authenticate scheduled jobs with a secret or signed token.
- Use database retention and cleanup.
- Remove invalid FCM tokens.
- Handle temporary delivery failures with retry.
- Use idempotency keys for scheduler jobs.
- Keep backend logs structured.
- Track delivery status in `notification_history`.

---

## 16. Frontend settings UI design

Add a `Settings → Notifications` section with:

### Main controls
- Enable notifications
- Disable notifications
- Show permission status
- Show device subscription status
- Send test notification

### Daily briefings
- Morning briefing: on/off
- Morning time
- Evening briefing: on/off
- Evening time

### Event categories
- Rain
- Heavy rain
- Thunderstorms
- Snow
- Strong winds
- Extreme heat
- Extreme cold/frost
- Fog
- Poor air quality
- Official weather warnings

### Location configuration
- Use current ATMOS location
- Select manual location
- Update latitude + longitude
- Keep a separate notification location from current weather location
- Save timezone with the preference

### Permission UX flow

1. Explain the benefit.
2. Show `Enable Notifications` button.
3. Request permission only after click.
4. If denied, explain browser settings steps.

---

## 17. Environment variables and deployment outline

### Frontend env

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_VAPID_KEY=
VITE_API_BASE_URL=https://your-backend.example.com
```

### Backend env

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
APP_SECRET=
CRON_SECRET=
OPEN_METEO_BASE_URL=https://api.open-meteo.com
SITE_URL=https://atmos.example.com
TZ=Asia/Karachi
```

### Deployment order

1. Configure Firebase and web app.
2. Deploy the API layer.
3. Configure Supabase schema.
4. Deploy the service worker update.
5. Ship frontend notification settings UI.
6. Run production smoke tests.
7. Validate real-device push delivery.

---

## 18. Testing plan and production checklist

### Required functional tests

1. Notification permission is granted successfully.
2. Permission denial is handled gracefully.
3. User disables notifications.
4. User updates notification location.
5. Morning briefing sends at configured time.
6. Evening briefing sends at configured time.
7. Rain alert generation works.
8. Heavy rain alert generation works.
9. Snow alert generation works.
10. Thunderstorm alert generation works.
11. Wind alert generation works.
12. Heat alert generation works.
13. Fog alert generation works.
14. Air-quality alert generation works.
15. Duplicate alerts are suppressed.
16. Severity escalation works.
17. Quiet hours are enforced correctly.
18. Multiple devices function independently.
19. Notifications work with website closed.
20. Clicking a notification opens the proper ATMOS city.
21. Expired registrations are removed.
22. Scheduler retries do not duplicate notifications.
23. Weather API failure does not generate false alerts.
24. Existing PWA offline functionality remains intact.

### Developer-only test mode

Add a feature flag or local test route that can simulate weather events without waiting for real weather. This must be disabled in production.

### Real-device requirement

The final acceptance test must be done on a real device and a real deployment. A browser-only or localhost check is not enough.

---

## 19. Production release gates

The push implementation is not complete until all of the following are true:

- User can enable notifications from ATMOS.
- Device subscription is stored securely.
- Morning and evening briefings fire at configured local times.
- Significant weather events trigger real alerts.
- Duplicate alerts are suppressed.
- Notifications work with ATMOS closed.
- Users can manage preferences.
- No account is required for the initial device-based version.
- Existing offline PWA functionality still works.
- Real end-to-end device testing passes on a live deployment.

---

## 20. Recommended first implementation order

### Phase 1 — Firebase and device registration
- Configure Firebase web app and messaging.
- Add registration UI and permission flow.
- Register FCM token and save to backend.

### Phase 2 — Database and preferences
- Create Supabase tables.
- Add user preferences and timezone support.
- Add unsubscribe and test-notification support.

### Phase 3 — Daily briefings
- Implement briefing scheduler.
- Add timezone-aware processing.
- Add notification history.

### Phase 4 — Weather event engine
- Add `weatherEventDetector`.
- Add rain, thunderstorm, wind, heat, cold, fog, and AQI rules.
- Add deduplication and severity escalation.

### Phase 5 — Scheduler and production reliability
- Add 30-minute cron job.
- Add cache and location grouping.
- Add rate limits, logs, cleanup, and retry handling.

### Phase 6 — Production verification
- Test on desktop Chrome, Android Chrome, and installed PWA.
- Validate real-device background delivery.
- Verify that the existing offline service worker still works.

---

## 21. Final status for this workspace

This workspace currently contains only the static app shell and offline service worker. It does not contain the required server-side runtime, Firebase project configuration, Supabase project, or a live deployment target. Because of that, the actual end-to-end push notification validation described in the acceptance criteria cannot be completed here.

The implementation should therefore proceed in a real deployment environment with:

- live Firebase project + web config
- live Supabase project + schema
- secure backend routes
- cron worker or scheduler
- real browser/device permission testing

The blueprint above is the safe and correct path to deploy a production notification system without breaking the existing ATMOS app or service worker.
