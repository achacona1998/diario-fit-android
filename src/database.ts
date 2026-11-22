import * as SQLite from "expo-sqlite";

export type ExerciseTemplate = {
  id: string;
  name: string;
  targetSets: number;
  minReps: number;
  maxReps: number;
  targetRir: number;
  restSeconds: number;
};

export type Routine = {
  id: string;
  name: string;
  notes: string;
  days: number[];
  exercises: ExerciseTemplate[];
};

export type WorkoutSet = {
  id: string;
  setNumber: number;
  weight: number | null;
  reps: number | null;
  rir: number | null;
  restSeconds: number;
};

export type WorkoutExercise = ExerciseTemplate & {
  notes: string;
  sets: WorkoutSet[];
};

export type WorkoutSession = {
  id: string;
  sessionNumber: number;
  name: string;
  routineId: string | null;
  status: "in_progress" | "completed" | "skipped";
  startedAt: string;
  endedAt: string | null;
  date: string;
  trainingOf: string;
  block: number;
  mesocycle: number;
  microcycle: number;
  dayNumber: number;
  conclusions: string;
  exercises: WorkoutExercise[];
};

export type Measurement = {
  id: string;
  date: string;
  weekStart: string;
  weight: number | null;
  bodyFat: number | null;
  chest: number | null;
  shoulders: number | null;
  rightArm: number | null;
  leftArm: number | null;
  waist: number | null;
  hips: number | null;
  rightThigh: number | null;
  leftThigh: number | null;
  rightCalf: number | null;
  leftCalf: number | null;
};

export type PerformanceRecord = {
  id: string;
  date: string;
  exerciseName: string;
  weight: number;
  reps: number;
  type: "weight" | "reps" | "manual";
  source: "auto" | "manual";
  sessionId: string | null;
};

type RoutineRow = {
  id: string;
  name: string;
  notes: string;
  exercise_id: string | null;
  exercise_name: string | null;
  target_sets: number | null;
  min_reps: number | null;
  max_reps: number | null;
  target_rir: number | null;
  rest_seconds: number | null;
  order_index: number | null;
  weekday: number | null;
};

const DATABASE_NAME = "diario-fit.db";
const CURRENT_SCHEMA = 1;
let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

function createId(): string {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function dateInput(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getWeekStart(date = new Date()): string {
  const monday = new Date(date);
  monday.setHours(12, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return dateInput(monday);
}

async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME).then(async (db) => {
      await db.execAsync("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
      const version = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version;");
      if ((version?.user_version || 0) < CURRENT_SCHEMA) {
        await db.withTransactionAsync(async () => {
          await db.execAsync(`
            CREATE TABLE IF NOT EXISTS app_settings (
              key TEXT PRIMARY KEY NOT NULL,
              value TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS routines (
              id TEXT PRIMARY KEY NOT NULL,
              name TEXT NOT NULL,
              notes TEXT NOT NULL DEFAULT ''
            );
            CREATE TABLE IF NOT EXISTS routine_schedule (
              weekday INTEGER PRIMARY KEY NOT NULL CHECK (weekday BETWEEN 0 AND 6),
              routine_id TEXT NOT NULL REFERENCES routines(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS routine_exercises (
              id TEXT PRIMARY KEY NOT NULL,
              routine_id TEXT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
              name TEXT NOT NULL,
              order_index INTEGER NOT NULL,
              target_sets INTEGER NOT NULL,
              min_reps INTEGER NOT NULL,
              max_reps INTEGER NOT NULL,
              target_rir REAL NOT NULL,
              rest_seconds INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS sessions (
              id TEXT PRIMARY KEY NOT NULL,
              session_number INTEGER NOT NULL UNIQUE,
              name TEXT NOT NULL,
              routine_id TEXT,
              status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'skipped')),
              started_at TEXT NOT NULL,
              ended_at TEXT,
              date TEXT NOT NULL,
              training_of TEXT NOT NULL DEFAULT '',
              block INTEGER NOT NULL DEFAULT 1,
              mesocycle INTEGER NOT NULL DEFAULT 1,
              microcycle INTEGER NOT NULL DEFAULT 1,
              day_number INTEGER NOT NULL CHECK (day_number BETWEEN 1 AND 7),
              conclusions TEXT NOT NULL DEFAULT ''
            );
            CREATE INDEX IF NOT EXISTS sessions_by_date ON sessions(date);
            CREATE TABLE IF NOT EXISTS session_exercises (
              id TEXT PRIMARY KEY NOT NULL,
              session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
              source_exercise_id TEXT,
              name TEXT NOT NULL,
              order_index INTEGER NOT NULL,
              target_sets INTEGER NOT NULL,
              min_reps INTEGER NOT NULL,
              max_reps INTEGER NOT NULL,
              target_rir REAL NOT NULL,
              rest_seconds INTEGER NOT NULL,
              notes TEXT NOT NULL DEFAULT ''
            );
            CREATE TABLE IF NOT EXISTS workout_sets (
              id TEXT PRIMARY KEY NOT NULL,
              session_exercise_id TEXT NOT NULL REFERENCES session_exercises(id) ON DELETE CASCADE,
              set_number INTEGER NOT NULL,
              weight REAL,
              reps INTEGER,
              rir REAL,
              rest_seconds INTEGER NOT NULL,
              UNIQUE (session_exercise_id, set_number)
            );
            CREATE TABLE IF NOT EXISTS body_measurements (
              id TEXT PRIMARY KEY NOT NULL,
              date TEXT NOT NULL,
              week_start TEXT NOT NULL UNIQUE,
              weight REAL,
              body_fat REAL,
              chest REAL,
              shoulders REAL,
              right_arm REAL,
              left_arm REAL,
              waist REAL,
              hips REAL,
              right_thigh REAL,
              left_thigh REAL,
              right_calf REAL,
              left_calf REAL
            );
            CREATE TABLE IF NOT EXISTS performance_records (
              id TEXT PRIMARY KEY NOT NULL,
              date TEXT NOT NULL,
              exercise_name TEXT NOT NULL,
              weight REAL NOT NULL,
              reps INTEGER NOT NULL,
              type TEXT NOT NULL CHECK (type IN ('weight', 'reps', 'manual')),
              source TEXT NOT NULL CHECK (source IN ('auto', 'manual')),
              session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL
            );
            CREATE INDEX IF NOT EXISTS performance_by_date ON performance_records(date);
            CREATE INDEX IF NOT EXISTS performance_by_exercise ON performance_records(exercise_name);
          `);
          await db.runAsync("INSERT OR IGNORE INTO app_settings (key, value) VALUES ('system', 'metric');");
          await db.runAsync("INSERT OR IGNORE INTO app_settings (key, value) VALUES ('header_defaults', ?);", JSON.stringify({
            trainingOfMode: "global", trainingOf: "General", block: 1, mesocycle: 1, microcycle: 1
          }));
          await db.runAsync("INSERT OR IGNORE INTO app_settings (key, value) VALUES ('reminder', ?);", JSON.stringify({
            enabled: false, days: [1, 3, 5], time: "18:00"
          }));
          await db.execAsync(`PRAGMA user_version = ${CURRENT_SCHEMA};`);
        });
      }
      return db;
    }).catch((error) => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}

export async function listRoutines(): Promise<Routine[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<RoutineRow>(`
    SELECT r.id, r.name, r.notes,
      e.id AS exercise_id, e.name AS exercise_name, e.target_sets, e.min_reps, e.max_reps,
      e.target_rir, e.rest_seconds, e.order_index, s.weekday
    FROM routines r
    LEFT JOIN routine_exercises e ON e.routine_id = r.id
    LEFT JOIN routine_schedule s ON s.routine_id = r.id
    ORDER BY r.name COLLATE NOCASE, e.order_index
  `);
  const routines = new Map<string, Routine>();
  for (const row of rows) {
    let routine = routines.get(row.id);
    if (!routine) {
      routine = { id: row.id, name: row.name, notes: row.notes, days: [], exercises: [] };
      routines.set(row.id, routine);
    }
    if (row.weekday !== null && !routine.days.includes(row.weekday)) routine.days.push(row.weekday);
    if (row.exercise_id && row.exercise_name !== null) {
      routine.exercises.push({
        id: row.exercise_id,
        name: row.exercise_name,
        targetSets: row.target_sets || 1,
        minReps: row.min_reps || 1,
        maxReps: row.max_reps || 1,
        targetRir: row.target_rir || 0,
        restSeconds: row.rest_seconds || 90
      });
    }
  }
  return [...routines.values()];
}

export async function saveRoutine(routine: Routine): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      "INSERT INTO routines (id, name, notes) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, notes = excluded.notes",
      routine.id, routine.name.trim(), routine.notes
    );
    await db.runAsync("DELETE FROM routine_schedule WHERE routine_id = ?", routine.id);
    for (const weekday of routine.days) {
      await db.runAsync(
        "INSERT INTO routine_schedule (weekday, routine_id) VALUES (?, ?) ON CONFLICT(weekday) DO UPDATE SET routine_id = excluded.routine_id",
        weekday, routine.id
      );
    }
    await db.runAsync("DELETE FROM routine_exercises WHERE routine_id = ?", routine.id);
    for (const [index, exercise] of routine.exercises.entries()) {
      await db.runAsync(
        `INSERT INTO routine_exercises
          (id, routine_id, name, order_index, target_sets, min_reps, max_reps, target_rir, rest_seconds)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        exercise.id || createId(), routine.id, exercise.name.trim(), index,
        exercise.targetSets, exercise.minReps, exercise.maxReps, exercise.targetRir, exercise.restSeconds
      );
    }
  });
}

export async function deleteRoutine(routineId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM routines WHERE id = ?", routineId);
}

export async function getSettings(): Promise<Record<string, string>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ key: string; value: string }>("SELECT key, value FROM app_settings");
  return Object.fromEntries(rows.map(({ key, value }) => [key, value]));
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    "INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    key, value
  );
}

export async function getScheduledRoutine(weekday: number): Promise<Routine | null> {
  const routines = await listRoutines();
  return routines.find((routine) => routine.days.includes(weekday)) || null;
}

export async function beginSession(routine: Routine | null, headers: {
  trainingOf: string;
  block: number;
  mesocycle: number;
  microcycle: number;
}): Promise<string> {
  const db = await getDatabase();
  const id = createId();
  const startedAt = new Date();
  const dayNumber = ((startedAt.getDay() + 6) % 7) + 1;
  const date = `${dateInput(startedAt)}T${String(startedAt.getHours()).padStart(2, "0")}:${String(startedAt.getMinutes()).padStart(2, "0")}:00`;
  const number = await db.getFirstAsync<{ next: number }>(
    "SELECT COALESCE(MAX(session_number), 0) + 1 AS next FROM sessions"
  );
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO sessions
        (id, session_number, name, routine_id, status, started_at, date, training_of, block, mesocycle, microcycle, day_number)
       VALUES (?, ?, ?, ?, 'in_progress', ?, ?, ?, ?, ?, ?, ?)`,
      id, number?.next || 1, routine?.name || "Sesión libre", routine?.id || null,
      startedAt.toISOString(), date, headers.trainingOf, headers.block, headers.mesocycle, headers.microcycle, dayNumber
    );
    for (const [index, exercise] of (routine?.exercises || []).entries()) {
      const sessionExerciseId = createId();
      await db.runAsync(
        `INSERT INTO session_exercises
          (id, session_id, source_exercise_id, name, order_index, target_sets, min_reps, max_reps, target_rir, rest_seconds)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        sessionExerciseId, id, exercise.id, exercise.name, index, exercise.targetSets,
        exercise.minReps, exercise.maxReps, exercise.targetRir, exercise.restSeconds
      );
      for (let setNumber = 1; setNumber <= exercise.targetSets; setNumber += 1) {
        await db.runAsync(
          `INSERT INTO workout_sets (id, session_exercise_id, set_number, rest_seconds)
           VALUES (?, ?, ?, ?)`,
          createId(), sessionExerciseId, setNumber, exercise.restSeconds
        );
      }
    }
  });
  return id;
}

type SessionRow = Omit<WorkoutSession, "exercises"> & {
  session_number: number;
  routine_id: string | null;
  started_at: string;
  ended_at: string | null;
  training_of: string;
  block: number;
  mesocycle: number;
  microcycle: number;
  day_number: number;
};

export async function getActiveSession(): Promise<WorkoutSession | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<SessionRow>("SELECT * FROM sessions WHERE status = 'in_progress' ORDER BY started_at DESC LIMIT 1");
  return row ? getSessionById(row.id) : null;
}

export async function getSessionById(sessionId: string): Promise<WorkoutSession | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<SessionRow>("SELECT * FROM sessions WHERE id = ?", sessionId);
  if (!row) return null;
  const exerciseRows = await db.getAllAsync<{
    id: string; source_exercise_id: string | null; name: string; order_index: number;
    target_sets: number; min_reps: number; max_reps: number; target_rir: number;
    rest_seconds: number; notes: string;
  }>("SELECT * FROM session_exercises WHERE session_id = ? ORDER BY order_index", sessionId);
  const exercises: WorkoutExercise[] = [];
  for (const exercise of exerciseRows) {
    const sets = await db.getAllAsync<{
      id: string; set_number: number; weight: number | null; reps: number | null; rir: number | null; rest_seconds: number;
    }>("SELECT * FROM workout_sets WHERE session_exercise_id = ? ORDER BY set_number", exercise.id);
    exercises.push({
      id: exercise.id,
      name: exercise.name,
      targetSets: exercise.target_sets,
      minReps: exercise.min_reps,
      maxReps: exercise.max_reps,
      targetRir: exercise.target_rir,
      restSeconds: exercise.rest_seconds,
      notes: exercise.notes,
      sets: sets.map((set) => ({
        id: set.id, setNumber: set.set_number, weight: set.weight, reps: set.reps, rir: set.rir,
        restSeconds: set.rest_seconds
      }))
    });
  }
  return {
    id: row.id,
    sessionNumber: row.session_number,
    name: row.name,
    routineId: row.routine_id,
    status: row.status,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    date: row.date,
    trainingOf: row.training_of,
    block: row.block,
    mesocycle: row.mesocycle,
    microcycle: row.microcycle,
    dayNumber: row.day_number,
    conclusions: row.conclusions,
    exercises
  };
}

export async function updateWorkoutSet(set: WorkoutSet): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE workout_sets SET weight = ?, reps = ?, rir = ?, rest_seconds = ? WHERE id = ?",
    set.weight, set.reps, set.rir, set.restSeconds, set.id
  );
}

export async function updateSessionNotes(sessionId: string, exerciseId: string, notes: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("UPDATE session_exercises SET notes = ? WHERE id = ?", notes, exerciseId);
  if (!exerciseId) await db.runAsync("UPDATE sessions SET conclusions = ? WHERE id = ?", notes, sessionId);
}

export async function finishSession(sessionId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE sessions SET status = 'completed', ended_at = ? WHERE id = ? AND status = 'in_progress'",
    new Date().toISOString(), sessionId
  );
}

export async function listRecentSessions(limit = 20): Promise<WorkoutSession[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ id: string }>(
    "SELECT id FROM sessions WHERE status = 'completed' ORDER BY date DESC LIMIT ?",
    limit
  );
  const sessions: WorkoutSession[] = [];
  for (const row of rows) {
    const session = await getSessionById(row.id);
    if (session) sessions.push(session);
  }
  return sessions;
}

export async function listMeasurements(): Promise<Measurement[]> {
  const db = await getDatabase();
  return db.getAllAsync<Measurement>("SELECT * FROM body_measurements ORDER BY date DESC");
}

export async function saveMeasurement(measurement: Measurement): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO body_measurements
      (id, date, week_start, weight, body_fat, chest, shoulders, right_arm, left_arm, waist, hips, right_thigh, left_thigh, right_calf, left_calf)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(week_start) DO UPDATE SET
      date = excluded.date, weight = excluded.weight, body_fat = excluded.body_fat,
      chest = excluded.chest, shoulders = excluded.shoulders, right_arm = excluded.right_arm,
      left_arm = excluded.left_arm, waist = excluded.waist, hips = excluded.hips,
      right_thigh = excluded.right_thigh, left_thigh = excluded.left_thigh,
      right_calf = excluded.right_calf, left_calf = excluded.left_calf`,
    measurement.id, measurement.date, measurement.weekStart, measurement.weight, measurement.bodyFat,
    measurement.chest, measurement.shoulders, measurement.rightArm, measurement.leftArm, measurement.waist,
    measurement.hips, measurement.rightThigh, measurement.leftThigh, measurement.rightCalf, measurement.leftCalf
  );
}

export async function listPerformanceRecords(): Promise<PerformanceRecord[]> {
  const db = await getDatabase();
  return db.getAllAsync<PerformanceRecord>("SELECT * FROM performance_records ORDER BY date DESC");
}

export async function createManualPerformance(record: PerformanceRecord): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO performance_records (id, date, exercise_name, weight, reps, type, source, session_id)
     VALUES (?, ?, ?, ?, ?, 'manual', 'manual', NULL)`,
    record.id, record.date, record.exerciseName, record.weight, record.reps
  );
}
