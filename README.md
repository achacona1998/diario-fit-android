# Diario Fit for Android

Diario Fit is an offline-first Android workout journal built with Expo and React Native. Training data is stored locally in SQLite; the app has no account or cloud synchronization.

## Run locally

Requirements: Node.js/npm and an Android device or emulator.

```powershell
npm install
npx expo start
```

For a native Android build, install Android Studio and the Android SDK, then run:

```powershell
npx expo run:android
```

The Windows web/PWA version is maintained separately and is not included in this repository.

## Features

- Workout routines with weekly scheduling, supersets, circuits, and drag-to-reorder exercises.
- Exercise library with muscle group, equipment, instructions, alternatives, and custom entries.
- Workout logging with previous-session values, rest timer, notes, RIR, and explained progression suggestions.
- Local tracking for sleep, energy, discomfort, water, supplements, and body measurements.
- Progress charts, personal records, weekly consistency and muscle-group volume, and smoothed body-weight trends.
- JSON backup and restore, full-history session and measurement CSV exports, and a PDF summary.
- Light and dark themes with local reminders.

## Checks

```powershell
npx tsc --noEmit
npx expo install --check
npx expo export --platform android
```

The exported reports and backups are shared through Android's system share sheet. JSON restores replace the current local database; export a backup before restoring if you need to keep existing data.
