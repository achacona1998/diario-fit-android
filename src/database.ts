import * as SQLite from "expo-sqlite";

export type ExerciseTemplate = {
  id: string;
  name: string;
  libraryExerciseId?: string | null;
  muscleGroup?: string;
  equipment?: string;
  instructions?: string;
  alternatives?: string;
  targetSets: number;
  minReps: number;
  maxReps: number;
  targetRir: number;
  restSeconds: number;
  groupId?: string | null;
  groupType?: "superset" | "circuit" | null;
};

export type ExerciseLibraryEntry = {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  instructions: string;
  alternatives: string;
  isCustom: boolean;
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
  energyRating: number | null;
  sleepHours: number | null;
  discomfortNotes: string;
  waterMl: number | null;
  supplements: string;
  exercises: WorkoutExercise[];
};

export type SessionContext = Pick<WorkoutSession, "energyRating" | "sleepHours" | "discomfortNotes" | "waterMl" | "supplements">;

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

export type ExerciseProgressPoint = {
  sessionId: string;
  sessionNumber: number;
  date: string;
  bestWeight: number | null;
  bestReps: number | null;
  volume: number;
};

export type PersonalRecord = {
  exerciseName: string;
  bestWeight: number | null;
  bestReps: number | null;
};

export type WeeklyMuscleVolume = {
  weekStart: string;
  muscleGroup: string;
  volume: number;
  completedSets: number;
};

export type WeeklySessionCount = {
  weekStart: string;
  completedSessions: number;
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
  group_id: string | null;
  group_type: "superset" | "circuit" | null;
  library_exercise_id: string | null;
  muscle_group: string | null;
  equipment: string | null;
  instructions: string | null;
  alternatives: string | null;
  weekday: number | null;
};

const DATABASE_NAME = "diario-fit.db";
const CURRENT_SCHEMA = 4;
const BACKUP_VERSION = 4;
const BACKUP_TABLES = {
  app_settings: ["key", "value"],
  exercise_library: ["id", "name", "muscle_group", "equipment", "instructions", "alternatives", "is_custom"],
  routines: ["id", "name", "notes"],
  routine_schedule: ["weekday", "routine_id"],
  routine_exercises: ["id", "routine_id", "name", "order_index", "target_sets", "min_reps", "max_reps", "target_rir", "rest_seconds", "group_id", "group_type", "library_exercise_id"],
  sessions: ["id", "session_number", "name", "routine_id", "status", "started_at", "ended_at", "date", "training_of", "block", "mesocycle", "microcycle", "day_number", "conclusions", "energy_rating", "sleep_hours", "discomfort_notes", "water_ml", "supplements"],
  session_exercises: ["id", "session_id", "source_exercise_id", "name", "order_index", "target_sets", "min_reps", "max_reps", "target_rir", "rest_seconds", "notes", "group_id", "group_type", "library_exercise_id"],
  workout_sets: ["id", "session_exercise_id", "set_number", "weight", "reps", "rir", "rest_seconds"],
  body_measurements: ["id", "date", "week_start", "weight", "body_fat", "chest", "shoulders", "right_arm", "left_arm", "waist", "hips", "right_thigh", "left_thigh", "right_calf", "left_calf"],
  performance_records: ["id", "date", "exercise_name", "weight", "reps", "type", "source", "session_id"]
} as const;
let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

const DEFAULT_EXERCISE_LIBRARY: ExerciseLibraryEntry[] = [
  { id: "builtin-squat", name: "Sentadilla con barra", muscleGroup: "Cuádriceps", equipment: "Barra y rack", instructions: "Apoya la barra de forma estable, baja con control y mantén el tronco firme.", alternatives: "Prensa de piernas, sentadilla goblet", isCustom: false },
  { id: "builtin-leg-press", name: "Prensa de piernas", muscleGroup: "Cuádriceps", equipment: "Máquina", instructions: "Mantén la espalda apoyada y evita bloquear las rodillas al extender.", alternatives: "Sentadilla con barra, sentadilla goblet", isCustom: false },
  { id: "builtin-leg-extension", name: "Extensión de rodilla", muscleGroup: "Cuádriceps", equipment: "Máquina", instructions: "Ajusta el eje de la máquina a la rodilla y extiende sin impulso.", alternatives: "Sentadilla, prensa de piernas", isCustom: false },
  { id: "builtin-leg-curl", name: "Curl femoral", muscleGroup: "Isquiotibiales", equipment: "Máquina", instructions: "Flexiona las rodillas con control y mantén la cadera estable.", alternatives: "Peso muerto rumano, puente de glúteos", isCustom: false },
  { id: "builtin-rdl", name: "Peso muerto rumano", muscleGroup: "Isquiotibiales", equipment: "Barra o mancuernas", instructions: "Lleva la cadera atrás con rodillas ligeramente flexionadas y espalda neutra.", alternatives: "Curl femoral, buenos días", isCustom: false },
  { id: "builtin-calf-raise", name: "Elevación de talones", muscleGroup: "Pantorrillas", equipment: "Máquina o peso corporal", instructions: "Completa el recorrido con pausa breve arriba y descenso controlado.", alternatives: "Elevación sentado, prensa de piernas", isCustom: false },
  { id: "builtin-bench", name: "Press de banca", muscleGroup: "Pecho", equipment: "Barra y banco", instructions: "Mantén los pies firmes, controla el descenso y empuja sin perder estabilidad.", alternatives: "Press con mancuernas, flexiones", isCustom: false },
  { id: "builtin-incline-press", name: "Press inclinado con mancuernas", muscleGroup: "Pecho", equipment: "Mancuernas y banco inclinado", instructions: "Baja las mancuernas con control y mantén las muñecas alineadas.", alternatives: "Press inclinado con barra, press de banca", isCustom: false },
  { id: "builtin-cable-fly", name: "Apertura en polea", muscleGroup: "Pecho", equipment: "Poleas", instructions: "Mantén una ligera flexión de codos y junta las manos sin balancearte.", alternatives: "Apertura con mancuernas, flexiones", isCustom: false },
  { id: "builtin-pullup", name: "Dominadas", muscleGroup: "Espalda", equipment: "Barra de dominadas", instructions: "Inicia el movimiento desde los hombros y evita balancear el cuerpo.", alternatives: "Jalón al pecho, dominada asistida", isCustom: false },
  { id: "builtin-lat-pulldown", name: "Jalón al pecho", muscleGroup: "Espalda", equipment: "Polea", instructions: "Lleva la barra hacia la parte alta del pecho sin inclinarte en exceso.", alternatives: "Dominadas asistidas, jalón con agarre neutro", isCustom: false },
  { id: "builtin-seated-row", name: "Remo sentado en polea", muscleGroup: "Espalda", equipment: "Polea", instructions: "Mantén el torso estable y lleva los codos hacia atrás.", alternatives: "Remo con mancuerna, remo con barra", isCustom: false },
  { id: "builtin-deadlift", name: "Peso muerto", muscleGroup: "Espalda", equipment: "Barra", instructions: "Asegura una posición estable, mantén la barra cerca y evita perder la postura.", alternatives: "Peso muerto con trap bar, peso muerto rumano", isCustom: false },
  { id: "builtin-overhead-press", name: "Press militar", muscleGroup: "Hombros", equipment: "Barra o mancuernas", instructions: "Mantén el abdomen firme y empuja en una trayectoria controlada.", alternatives: "Press sentado con mancuernas, máquina de hombros", isCustom: false },
  { id: "builtin-lateral-raise", name: "Elevación lateral", muscleGroup: "Hombros", equipment: "Mancuernas o polea", instructions: "Eleva con control hasta una altura cómoda, sin impulso del tronco.", alternatives: "Elevación lateral en polea, máquina lateral", isCustom: false },
  { id: "builtin-biceps-curl", name: "Curl de bíceps", muscleGroup: "Bíceps", equipment: "Mancuernas o barra", instructions: "Mantén los codos estables y evita balancear el torso.", alternatives: "Curl martillo, curl en polea", isCustom: false },
  { id: "builtin-triceps-pushdown", name: "Extensión de tríceps en polea", muscleGroup: "Tríceps", equipment: "Polea", instructions: "Mantén los codos cerca del cuerpo y extiende sin mover los hombros.", alternatives: "Extensión sobre la cabeza, fondos asistidos", isCustom: false },
  { id: "builtin-plank", name: "Plancha", muscleGroup: "Core", equipment: "Peso corporal", instructions: "Mantén el cuerpo alineado y respira con normalidad durante la serie.", alternatives: "Dead bug, plancha lateral", isCustom: false }
];

type BackupTable = keyof typeof BACKUP_TABLES;
type BackupRow = Record<string, string | number | null>;
type DatabaseBackup = {
  app: "Diario Fit";
  version: number;
  exportedAt: string;
  tables: Record<BackupTable, BackupRow[]>;
};

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
            CREATE TABLE IF NOT EXISTS exercise_library (
              id TEXT PRIMARY KEY NOT NULL,
              name TEXT NOT NULL UNIQUE COLLATE NOCASE,
              muscle_group TEXT NOT NULL DEFAULT 'Sin clasificar',
              equipment TEXT NOT NULL DEFAULT '',
              instructions TEXT NOT NULL DEFAULT '',
              alternatives TEXT NOT NULL DEFAULT '',
              is_custom INTEGER NOT NULL DEFAULT 1 CHECK (is_custom IN (0, 1))
            );
            CREATE INDEX IF NOT EXISTS exercise_library_by_group ON exercise_library(muscle_group);
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
          if ((version?.user_version || 0) < 2) {
            await db.execAsync(`
              ALTER TABLE routine_exercises ADD COLUMN group_id TEXT;
              ALTER TABLE routine_exercises ADD COLUMN group_type TEXT CHECK (group_type IS NULL OR group_type IN ('superset', 'circuit'));
              ALTER TABLE session_exercises ADD COLUMN group_id TEXT;
              ALTER TABLE session_exercises ADD COLUMN group_type TEXT CHECK (group_type IS NULL OR group_type IN ('superset', 'circuit'));
            `);
          }
          if ((version?.user_version || 0) < 3) {
            await db.execAsync(`
              ALTER TABLE sessions ADD COLUMN energy_rating INTEGER CHECK (energy_rating IS NULL OR energy_rating BETWEEN 1 AND 5);
              ALTER TABLE sessions ADD COLUMN sleep_hours REAL CHECK (sleep_hours IS NULL OR sleep_hours BETWEEN 0 AND 24);
              ALTER TABLE sessions ADD COLUMN discomfort_notes TEXT NOT NULL DEFAULT '';
              ALTER TABLE sessions ADD COLUMN water_ml INTEGER CHECK (
                water_ml IS NULL OR (water_ml >= 0 AND water_ml = CAST(water_ml AS INTEGER))
              );
              ALTER TABLE sessions ADD COLUMN supplements TEXT NOT NULL DEFAULT '';
            `);
          }
          if ((version?.user_version || 0) < 4) {
            await db.execAsync(`
              ALTER TABLE routine_exercises ADD COLUMN library_exercise_id TEXT REFERENCES exercise_library(id) ON DELETE SET NULL;
              ALTER TABLE session_exercises ADD COLUMN library_exercise_id TEXT REFERENCES exercise_library(id) ON DELETE SET NULL;
            `);
            for (const exercise of DEFAULT_EXERCISE_LIBRARY) {
              await db.runAsync(
                `INSERT OR IGNORE INTO exercise_library
                 (id, name, muscle_group, equipment, instructions, alternatives, is_custom)
                 VALUES (?, ?, ?, ?, ?, ?, 0)`,
                exercise.id, exercise.name, exercise.muscleGroup, exercise.equipment, exercise.instructions, exercise.alternatives
              );
            }
            const existingNames = await db.getAllAsync<{ name: string }>(
              "SELECT name FROM routine_exercises UNION SELECT name FROM session_exercises"
            );
            for (const { name } of existingNames) {
              let entry = await db.getFirstAsync<{ id: string }>(
                "SELECT id FROM exercise_library WHERE name = ? COLLATE NOCASE",
                name
              );
              if (!entry) {
                const id = createId();
                await db.runAsync(
                  `INSERT INTO exercise_library (id, name, muscle_group, is_custom)
                   VALUES (?, ?, 'Sin clasificar', 1)`,
                  id, name
                );
                entry = { id };
              }
              await db.runAsync(
                "UPDATE routine_exercises SET library_exercise_id = ? WHERE library_exercise_id IS NULL AND name = ?",
                entry.id, name
              );
              await db.runAsync(
                "UPDATE session_exercises SET library_exercise_id = ? WHERE library_exercise_id IS NULL AND name = ?",
                entry.id, name
              );
            }
          }
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
  const [routineRows, exerciseRows, scheduleRows] = await Promise.all([
    db.getAllAsync<{ id: string; name: string; notes: string }>(
      "SELECT id, name, notes FROM routines ORDER BY name COLLATE NOCASE"
    ),
    db.getAllAsync<Omit<RoutineRow, "weekday">>(
      `SELECT re.routine_id AS id, re.id AS exercise_id, re.name AS exercise_name,
              re.target_sets, re.min_reps, re.max_reps, re.target_rir, re.rest_seconds,
              re.order_index, re.group_id, re.group_type, re.library_exercise_id,
              el.muscle_group, el.equipment, el.instructions, el.alternatives
       FROM routine_exercises re
       LEFT JOIN exercise_library el ON el.id = re.library_exercise_id
       ORDER BY re.routine_id, re.order_index`
    ),
    db.getAllAsync<{ routine_id: string; weekday: number }>(
      "SELECT routine_id, weekday FROM routine_schedule ORDER BY weekday"
    )
  ]);
  const routines = new Map<string, Routine>();
  routineRows.forEach((row) => routines.set(row.id, {
    id: row.id, name: row.name, notes: row.notes, days: [], exercises: []
  }));
  scheduleRows.forEach((row) => routines.get(row.routine_id)?.days.push(row.weekday));
  exerciseRows.forEach((row) => {
    routines.get(row.id)?.exercises.push({
      id: row.exercise_id || createId(),
      name: row.exercise_name || "",
      targetSets: row.target_sets || 1,
      minReps: row.min_reps || 1,
      maxReps: row.max_reps || 1,
      targetRir: row.target_rir || 0,
      restSeconds: row.rest_seconds || 90,
      groupId: row.group_id,
      groupType: row.group_type,
      libraryExerciseId: row.library_exercise_id,
      muscleGroup: row.muscle_group || "Sin clasificar",
      equipment: row.equipment || "",
      instructions: row.instructions || "",
      alternatives: row.alternatives || ""
    });
  });
  for (const routine of routines.values()) {
    routine.days.sort((a, b) => a - b);
  }
  return [...routines.values()];
}

export async function listExerciseLibrary(): Promise<ExerciseLibraryEntry[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string; name: string; muscle_group: string; equipment: string;
    instructions: string; alternatives: string; is_custom: number;
  }>("SELECT * FROM exercise_library ORDER BY muscle_group COLLATE NOCASE, name COLLATE NOCASE");
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    muscleGroup: row.muscle_group,
    equipment: row.equipment,
    instructions: row.instructions,
    alternatives: row.alternatives,
    isCustom: row.is_custom === 1
  }));
}

export async function saveExerciseLibraryEntry(entry: ExerciseLibraryEntry): Promise<void> {
  const db = await getDatabase();
  const name = entry.name.trim();
  const muscleGroup = entry.muscleGroup.trim();
  if (!name || !muscleGroup) throw new Error("Indica el nombre del ejercicio y su grupo muscular.");
  const id = entry.id || createId();
  await db.withTransactionAsync(async () => {
    const previous = await db.getFirstAsync<{ name: string }>(
      "SELECT name FROM exercise_library WHERE id = ?", id
    );
    await db.runAsync(
      `INSERT INTO exercise_library (id, name, muscle_group, equipment, instructions, alternatives, is_custom)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name, muscle_group = excluded.muscle_group, equipment = excluded.equipment,
         instructions = excluded.instructions, alternatives = excluded.alternatives`,
      id, name, muscleGroup, entry.equipment.trim(),
      entry.instructions.trim(), entry.alternatives.trim(), entry.isCustom ? 1 : 0
    );
    if (previous && previous.name !== name) {
      await db.runAsync("UPDATE routine_exercises SET name = ? WHERE library_exercise_id = ?", name, id);
    }
  });
}

async function ensureLibraryExercise(name: string): Promise<string> {
  const db = await getDatabase();
  const normalizedName = name.trim();
  const existing = await db.getFirstAsync<{ id: string }>(
    "SELECT id FROM exercise_library WHERE name = ? COLLATE NOCASE",
    normalizedName
  );
  if (existing) return existing.id;
  const id = createId();
  await db.runAsync(
    `INSERT OR IGNORE INTO exercise_library (id, name, muscle_group, is_custom)
     VALUES (?, ?, 'Sin clasificar', 1)`,
    id, normalizedName
  );
  const created = await db.getFirstAsync<{ id: string }>(
    "SELECT id FROM exercise_library WHERE name = ? COLLATE NOCASE",
    normalizedName
  );
  if (!created) throw new Error("No se pudo guardar el ejercicio en la biblioteca.");
  return created.id;
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
      const libraryExerciseId = exercise.libraryExerciseId || await ensureLibraryExercise(exercise.name);
      await db.runAsync(
        `INSERT INTO routine_exercises
          (id, routine_id, name, order_index, target_sets, min_reps, max_reps, target_rir, rest_seconds, group_id, group_type, library_exercise_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        exercise.id || createId(), routine.id, exercise.name.trim(), index,
        exercise.targetSets, exercise.minReps, exercise.maxReps, exercise.targetRir, exercise.restSeconds,
        exercise.groupId ?? null, exercise.groupType ?? null, libraryExerciseId
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
      const libraryExerciseId = exercise.libraryExerciseId || await ensureLibraryExercise(exercise.name);
      const previousSets = await db.getAllAsync<{ weight: number | null; reps: number | null; rir: number | null }>(
        `SELECT ws.weight, ws.reps, ws.rir
         FROM workout_sets ws
         JOIN session_exercises se ON se.id = ws.session_exercise_id
         JOIN sessions s ON s.id = se.session_id
         WHERE (se.library_exercise_id = ? OR lower(se.name) = lower(?))
           AND s.status = 'completed'
           AND s.id = (
             SELECT s2.id FROM sessions s2
             JOIN session_exercises se2 ON se2.session_id = s2.id
             WHERE s2.status = 'completed'
               AND (se2.library_exercise_id = ? OR lower(se2.name) = lower(?))
             ORDER BY s2.date DESC, s2.session_number DESC LIMIT 1
           )
         ORDER BY s.date DESC, ws.set_number ASC
         LIMIT ?`,
        exercise.libraryExerciseId ?? null, exercise.name,
        exercise.libraryExerciseId ?? null, exercise.name, exercise.targetSets
      );
      await db.runAsync(
        `INSERT INTO session_exercises
          (id, session_id, source_exercise_id, name, order_index, target_sets, min_reps, max_reps, target_rir, rest_seconds, group_id, group_type, library_exercise_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        sessionExerciseId, id, exercise.id, exercise.name, index, exercise.targetSets,
        exercise.minReps, exercise.maxReps, exercise.targetRir, exercise.restSeconds,
        exercise.groupId ?? null, exercise.groupType ?? null, libraryExerciseId
      );
      for (let setNumber = 1; setNumber <= exercise.targetSets; setNumber += 1) {
        const previous = previousSets[setNumber - 1] || previousSets.at(-1);
        await db.runAsync(
          `INSERT INTO workout_sets (id, session_exercise_id, set_number, weight, reps, rir, rest_seconds)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          createId(), sessionExerciseId, setNumber, previous?.weight ?? null, previous?.reps ?? null,
          previous?.rir ?? null, exercise.restSeconds
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
  energy_rating: number | null;
  sleep_hours: number | null;
  discomfort_notes: string;
  water_ml: number | null;
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
    rest_seconds: number; notes: string; group_id: string | null; group_type: "superset" | "circuit" | null;
    library_exercise_id: string | null; muscle_group: string | null; equipment: string | null;
    instructions: string | null; alternatives: string | null;
  }>(`SELECT se.*, el.muscle_group, el.equipment, el.instructions, el.alternatives
      FROM session_exercises se
      LEFT JOIN exercise_library el ON el.id = se.library_exercise_id
      WHERE se.session_id = ? ORDER BY se.order_index`, sessionId);
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
      groupId: exercise.group_id,
      groupType: exercise.group_type,
      libraryExerciseId: exercise.library_exercise_id,
      muscleGroup: exercise.muscle_group || "Sin clasificar",
      equipment: exercise.equipment || "",
      instructions: exercise.instructions || "",
      alternatives: exercise.alternatives || "",
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
    energyRating: row.energy_rating,
    sleepHours: row.sleep_hours,
    discomfortNotes: row.discomfort_notes,
    waterMl: row.water_ml,
    supplements: row.supplements,
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
  if (exerciseId) {
    await db.runAsync("UPDATE session_exercises SET notes = ? WHERE id = ?", notes, exerciseId);
  } else {
    await db.runAsync("UPDATE sessions SET conclusions = ? WHERE id = ?", notes, sessionId);
  }
}

export async function updateSessionContext(sessionId: string, context: SessionContext): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE sessions
     SET energy_rating = ?, sleep_hours = ?, discomfort_notes = ?, water_ml = ?, supplements = ?
     WHERE id = ?`,
    context.energyRating, context.sleepHours, context.discomfortNotes, context.waterMl, context.supplements, sessionId
  );
}

export async function updateSessionHeader(sessionId: string, key: "training_of" | "block" | "mesocycle" | "microcycle", value: string | number): Promise<void> {
  const allowed: Record<typeof key, string> = {
    training_of: "training_of",
    block: "block",
    mesocycle: "mesocycle",
    microcycle: "microcycle"
  };
  const db = await getDatabase();
  await db.runAsync(`UPDATE sessions SET ${allowed[key]} = ? WHERE id = ?`, value, sessionId);
}

export async function addWorkoutSet(sessionExerciseId: string, restSeconds: number): Promise<void> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ next: number }>(
    "SELECT COALESCE(MAX(set_number), 0) + 1 AS next FROM workout_sets WHERE session_exercise_id = ?",
    sessionExerciseId
  );
  await db.runAsync(
    "INSERT INTO workout_sets (id, session_exercise_id, set_number, rest_seconds) VALUES (?, ?, ?, ?)",
    createId(), sessionExerciseId, row?.next || 1, restSeconds
  );
}

export async function addSessionExercise(sessionId: string, exercise: ExerciseTemplate): Promise<void> {
  const db = await getDatabase();
  const libraryExerciseId = exercise.libraryExerciseId || await ensureLibraryExercise(exercise.name);
  const row = await db.getFirstAsync<{ next: number }>(
    "SELECT COALESCE(MAX(order_index), -1) + 1 AS next FROM session_exercises WHERE session_id = ?",
    sessionId
  );
  const exerciseId = createId();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO session_exercises
        (id, session_id, source_exercise_id, name, order_index, target_sets, min_reps, max_reps, target_rir, rest_seconds, group_id, group_type, library_exercise_id)
       VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      exerciseId, sessionId, exercise.name, row?.next || 0, exercise.targetSets,
      exercise.minReps, exercise.maxReps, exercise.targetRir, exercise.restSeconds,
      exercise.groupId ?? null, exercise.groupType ?? null, libraryExerciseId
    );
    for (let setNumber = 1; setNumber <= exercise.targetSets; setNumber += 1) {
      await db.runAsync(
        "INSERT INTO workout_sets (id, session_exercise_id, set_number, rest_seconds) VALUES (?, ?, ?, ?)",
        createId(), exerciseId, setNumber, exercise.restSeconds
      );
    }
  });
}

export async function deleteSessionExercise(exerciseId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM session_exercises WHERE id = ?", exerciseId);
}

export async function deleteWorkoutSet(setId: string, exerciseId: string): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM workout_sets WHERE id = ?", setId);
    const sets = await db.getAllAsync<{ id: string }>(
      "SELECT id FROM workout_sets WHERE session_exercise_id = ? ORDER BY set_number",
      exerciseId
    );
    for (const [index, set] of sets.entries()) {
      await db.runAsync("UPDATE workout_sets SET set_number = ? WHERE id = ?", index + 1, set.id);
    }
  });
}

export async function restoreWorkoutSet(sessionExerciseId: string, set: WorkoutSet): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    const insertionIndex = Math.max(1, set.setNumber);
    await db.runAsync(
      "UPDATE workout_sets SET set_number = -set_number WHERE session_exercise_id = ?",
      sessionExerciseId
    );
    await db.runAsync(
      `INSERT INTO workout_sets (id, session_exercise_id, set_number, weight, reps, rir, rest_seconds)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      createId(), sessionExerciseId, insertionIndex, set.weight, set.reps, set.rir, set.restSeconds
    );
    const existing = await db.getAllAsync<{ id: string; set_number: number }>(
      "SELECT id, set_number FROM workout_sets WHERE session_exercise_id = ? AND set_number < 0",
      sessionExerciseId
    );
    for (const row of existing) {
      const originalIndex = Math.abs(row.set_number);
      const restoredIndex = originalIndex >= insertionIndex ? originalIndex + 1 : originalIndex;
      await db.runAsync("UPDATE workout_sets SET set_number = ? WHERE id = ?", restoredIndex, row.id);
    }
  });
}

export async function finishSession(sessionId: string): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    const exercises = await db.getAllAsync<{
      name: string; exercise_id: string; weight: number | null; reps: number | null;
    }>(`
      SELECT se.id AS exercise_id, se.name, ws.weight, ws.reps
      FROM session_exercises se
      JOIN workout_sets ws ON ws.session_exercise_id = se.id
      WHERE se.session_id = ? AND ws.weight IS NOT NULL AND ws.reps IS NOT NULL
      ORDER BY se.order_index, ws.set_number
    `, sessionId);
    const grouped = new Map<string, { name: string; sets: Array<{ weight: number; reps: number }> }>();
    exercises.forEach((row) => {
      if (row.weight === null || row.reps === null) return;
      const key = row.name.toLocaleLowerCase("es");
      const group = grouped.get(key) || { name: row.name, sets: [] };
      group.sets.push({ weight: row.weight, reps: row.reps });
      grouped.set(key, group);
    });

    await db.runAsync(
      "UPDATE sessions SET status = 'completed', ended_at = ? WHERE id = ? AND status = 'in_progress'",
      new Date().toISOString(), sessionId
    );
    for (const group of grouped.values()) {
      const previous = await db.getAllAsync<{ weight: number; reps: number }>(
        `SELECT ws.weight, ws.reps FROM workout_sets ws
         JOIN session_exercises se ON se.id = ws.session_exercise_id
         JOIN sessions s ON s.id = se.session_id
         WHERE lower(se.name) = lower(?) AND s.id != ? AND ws.weight IS NOT NULL AND ws.reps IS NOT NULL`,
        group.name, sessionId
      );
      const maxPreviousWeight = previous.reduce((max, set) => Math.max(max, set.weight), 0);
      const best = group.sets.reduce((current, set) =>
        set.weight > current.weight || (set.weight === current.weight && set.reps > current.reps) ? set : current);
      if (best.weight > maxPreviousWeight) {
        await db.runAsync(
          `INSERT INTO performance_records (id, date, exercise_name, weight, reps, type, source, session_id)
           VALUES (?, datetime('now'), ?, ?, ?, 'weight', 'auto', ?)`,
          createId(), group.name, best.weight, best.reps, sessionId
        );
      }
      const weights = [...new Set(group.sets.map((set) => set.weight))];
      for (const weight of weights) {
        const bestReps = Math.max(...group.sets.filter((set) => set.weight === weight).map((set) => set.reps));
        const previousReps = previous.filter((set) => set.weight === weight).reduce((max, set) => Math.max(max, set.reps), 0);
        if (previousReps > 0 && bestReps > previousReps) {
          await db.runAsync(
            `INSERT INTO performance_records (id, date, exercise_name, weight, reps, type, source, session_id)
             VALUES (?, datetime('now'), ?, ?, ?, 'reps', 'auto', ?)`,
            createId(), group.name, weight, bestReps, sessionId
          );
        }
      }
    }
  });
}

export async function deleteSession(sessionId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM sessions WHERE id = ?", sessionId);
}

export async function listRecentSessions(limit: number | null = 100): Promise<WorkoutSession[]> {
  const db = await getDatabase();
  const rows = limit === null
    ? await db.getAllAsync<{ id: string }>("SELECT id FROM sessions WHERE status = 'completed' ORDER BY date DESC")
    : await db.getAllAsync<{ id: string }>(
      "SELECT id FROM sessions WHERE status = 'completed' ORDER BY date DESC LIMIT ?", limit
    );
  const sessions: WorkoutSession[] = [];
  for (const row of rows) {
    const session = await getSessionById(row.id);
    if (session) sessions.push(session);
  }
  return sessions;
}

export async function listProgressExerciseNames(): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ name: string }>(
    `SELECT COALESCE(el.name, MIN(se.name)) AS name FROM session_exercises se
     JOIN sessions s ON s.id = se.session_id
     LEFT JOIN exercise_library el ON el.id = se.library_exercise_id
     WHERE s.status = 'completed'
     GROUP BY COALESCE(se.library_exercise_id, lower(se.name))
     ORDER BY lower(COALESCE(el.name, MIN(se.name)))`
  );
  return rows.map((row) => row.name);
}

export async function listExerciseProgress(
  exerciseName: string,
  startDate: string | null = null,
  endDate: string | null = null
): Promise<ExerciseProgressPoint[]> {
  const db = await getDatabase();
  return db.getAllAsync<ExerciseProgressPoint>(
    `SELECT s.id AS sessionId, s.session_number AS sessionNumber, s.date,
            MAX(ws.weight) AS bestWeight, MAX(ws.reps) AS bestReps,
            SUM(CASE WHEN ws.weight IS NOT NULL AND ws.reps IS NOT NULL
                     THEN ws.weight * ws.reps ELSE 0 END) AS volume
     FROM sessions s
     JOIN session_exercises se ON se.session_id = s.id
     JOIN workout_sets ws ON ws.session_exercise_id = se.id
     WHERE s.status = 'completed'
       AND (lower(se.name) = lower(?) OR se.library_exercise_id = (
         SELECT id FROM exercise_library WHERE name = ? COLLATE NOCASE
       ))
       AND ws.weight IS NOT NULL AND ws.reps IS NOT NULL
       AND (? IS NULL OR s.date >= ?)
       AND (? IS NULL OR s.date <= ?)
     GROUP BY s.id, s.session_number, s.date
     ORDER BY s.date, s.session_number`,
    exerciseName, exerciseName, startDate, startDate, endDate, endDate
  );
}

export async function listPersonalRecords(): Promise<PersonalRecord[]> {
  const db = await getDatabase();
  return db.getAllAsync<PersonalRecord>(
    `SELECT COALESCE(el.name, MIN(se.name)) AS exerciseName,
            MAX(ws.weight) AS bestWeight, MAX(ws.reps) AS bestReps
     FROM sessions s
     JOIN session_exercises se ON se.session_id = s.id
     JOIN workout_sets ws ON ws.session_exercise_id = se.id
     LEFT JOIN exercise_library el ON el.id = se.library_exercise_id
     WHERE s.status = 'completed' AND ws.weight IS NOT NULL AND ws.reps IS NOT NULL
     GROUP BY COALESCE(se.library_exercise_id, lower(se.name))
     ORDER BY exerciseName COLLATE NOCASE`
  );
}

export async function listWeeklyMuscleVolume(startDate: string): Promise<WeeklyMuscleVolume[]> {
  const db = await getDatabase();
  return db.getAllAsync<WeeklyMuscleVolume>(
    `SELECT date(s.date, '-' || ((CAST(strftime('%w', s.date) AS INTEGER) + 6) % 7) || ' days') AS weekStart,
            COALESCE(NULLIF(el.muscle_group, ''), 'Sin clasificar') AS muscleGroup,
            SUM(ws.weight * ws.reps) AS volume, COUNT(*) AS completedSets
     FROM sessions s
     JOIN session_exercises se ON se.session_id = s.id
     JOIN workout_sets ws ON ws.session_exercise_id = se.id
     LEFT JOIN exercise_library el ON el.id = se.library_exercise_id
     WHERE s.status = 'completed' AND s.date >= ?
       AND ws.weight IS NOT NULL AND ws.reps IS NOT NULL
     GROUP BY weekStart, muscleGroup
     ORDER BY weekStart DESC, volume DESC`,
    startDate
  );
}

export async function listWeeklySessionCounts(startDate: string): Promise<WeeklySessionCount[]> {
  const db = await getDatabase();
  return db.getAllAsync<WeeklySessionCount>(
    `SELECT date(date, '-' || ((CAST(strftime('%w', date) AS INTEGER) + 6) % 7) || ' days') AS weekStart,
            COUNT(*) AS completedSessions
     FROM sessions
     WHERE status = 'completed' AND date >= ?
     GROUP BY weekStart
     ORDER BY weekStart DESC`,
    startDate
  );
}

export async function getPlannedWorkoutCount(): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM routine_schedule");
  return row?.count || 0;
}

export async function listSessionsForWeek(weekStart = getWeekStart()): Promise<WorkoutSession[]> {
  const db = await getDatabase();
  const end = new Date(`${weekStart}T12:00:00`);
  end.setDate(end.getDate() + 7);
  const rows = await db.getAllAsync<{ id: string }>(
    "SELECT id FROM sessions WHERE status = 'completed' AND date >= ? AND date < ? ORDER BY date DESC",
    `${weekStart}T00:00`, `${dateInput(end)}T00:00`
  );
  const sessions: WorkoutSession[] = [];
  for (const row of rows) {
    const session = await getSessionById(row.id);
    if (session) sessions.push(session);
  }
  return sessions;
}

export async function saveMeasurementAndGetId(measurement: Measurement): Promise<void> {
  await saveMeasurement(measurement);
}

export async function listMeasurements(): Promise<Measurement[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string; date: string; week_start: string; weight: number | null; body_fat: number | null;
    chest: number | null; shoulders: number | null; right_arm: number | null; left_arm: number | null;
    waist: number | null; hips: number | null; right_thigh: number | null; left_thigh: number | null;
    right_calf: number | null; left_calf: number | null;
  }>("SELECT * FROM body_measurements ORDER BY date DESC");
  return rows.map((row) => ({
    id: row.id, date: row.date, weekStart: row.week_start, weight: row.weight, bodyFat: row.body_fat,
    chest: row.chest, shoulders: row.shoulders, rightArm: row.right_arm, leftArm: row.left_arm,
    waist: row.waist, hips: row.hips, rightThigh: row.right_thigh, leftThigh: row.left_thigh,
    rightCalf: row.right_calf, leftCalf: row.left_calf
  }));
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

export async function exportDatabaseBackup(): Promise<string> {
  const db = await getDatabase();
  const tables = {} as DatabaseBackup["tables"];
  for (const table of Object.keys(BACKUP_TABLES) as BackupTable[]) {
    tables[table] = await db.getAllAsync<BackupRow>(`SELECT * FROM ${table}`);
  }
  const backup: DatabaseBackup = {
    app: "Diario Fit",
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    tables
  };
  return JSON.stringify(backup, null, 2);
}

export async function importDatabaseBackup(content: string): Promise<void> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("El archivo no contiene un JSON válido.");
  }
  if (!parsed || typeof parsed !== "object") throw new Error("El archivo de copia no tiene el formato esperado.");
  const backup = parsed as Partial<DatabaseBackup>;
  if (backup.app !== "Diario Fit" ||
    (backup.version !== 1 && backup.version !== 2 && backup.version !== 3 && backup.version !== BACKUP_VERSION) ||
    !backup.tables || typeof backup.tables !== "object") {
    throw new Error("La copia no es compatible con esta versión de Diario Fit.");
  }

  const prepared = {} as DatabaseBackup["tables"];
  for (const table of Object.keys(BACKUP_TABLES) as BackupTable[]) {
    const rows = backup.tables[table];
    if (!Array.isArray(rows)) {
      if (table === "exercise_library" && backup.version < 4) {
        prepared[table] = [];
        continue;
      }
      throw new Error(`La copia está incompleta: falta la tabla ${table}.`);
    }
    const columns = BACKUP_TABLES[table] as readonly string[];
    const inputColumns = table === "sessions" && backup.version < 3
      ? columns.slice(0, -5)
      : (table === "routine_exercises" || table === "session_exercises") && backup.version === 1
        ? columns.slice(0, -3)
        : (table === "routine_exercises" || table === "session_exercises") && backup.version < 4
          ? columns.slice(0, -1)
          : columns;
    prepared[table] = rows.map((row, index) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) throw new Error(`Fila inválida en ${table} (${index + 1}).`);
      const source = row as Record<string, unknown>;
      if (Object.keys(source).length !== inputColumns.length || inputColumns.some((column) => !(column in source))) {
        throw new Error(`Columnas no válidas en ${table} (${index + 1}).`);
      }
      const result: BackupRow = {};
      for (const column of columns) {
        const value = column in source ? source[column]
          : column === "discomfort_notes" || column === "supplements" ? ""
            : null;
        if (value !== null && typeof value !== "string" && (typeof value !== "number" || !Number.isFinite(value))) {
          throw new Error(`Dato no válido en ${table}.${column} (${index + 1}).`);
        }
        result[column] = value as string | number | null;
      }
      return result;
    });
  }
  if (backup.version < 4) {
    for (const exercise of DEFAULT_EXERCISE_LIBRARY) {
      prepared.exercise_library.push({
        id: exercise.id,
        name: exercise.name,
        muscle_group: exercise.muscleGroup,
        equipment: exercise.equipment,
        instructions: exercise.instructions,
        alternatives: exercise.alternatives,
        is_custom: 0
      });
    }
    const libraryByName = new Map(prepared.exercise_library.map((row) =>
      [String(row.name).toLocaleLowerCase("es"), String(row.id)]));
    for (const table of ["routine_exercises", "session_exercises"] as const) {
      for (const exercise of prepared[table]) {
        const name = String(exercise.name);
        const key = name.toLocaleLowerCase("es");
        let id = libraryByName.get(key);
        if (!id) {
          id = createId();
          prepared.exercise_library.push({
            id, name, muscle_group: "Sin clasificar", equipment: "", instructions: "", alternatives: "", is_custom: 1
          });
          libraryByName.set(key, id);
        }
        exercise.library_exercise_id = id;
      }
    }
  } else {
    const libraryIds = new Set(prepared.exercise_library.map((row) => row.id));
    for (const table of ["routine_exercises", "session_exercises"] as const) {
      for (const exercise of prepared[table]) {
        if (exercise.library_exercise_id !== null && !libraryIds.has(exercise.library_exercise_id)) {
          throw new Error(`La copia contiene una referencia de biblioteca no válida en ${table}.`);
        }
      }
    }
  }
  if (!prepared.app_settings.some((row) => row.key === "system") ||
    !prepared.app_settings.some((row) => row.key === "reminder") ||
    !prepared.app_settings.some((row) => row.key === "header_defaults")) {
    throw new Error("La copia no incluye todos los ajustes requeridos.");
  }
  const settingMap = Object.fromEntries(prepared.app_settings.map((row) => [row.key, row.value]));
  if (new Set(prepared.app_settings.map((row) => row.key)).size !== prepared.app_settings.length ||
    (settingMap.system !== "metric" && settingMap.system !== "imperial")) {
    throw new Error("Los ajustes de la copia no son válidos.");
  }
  try {
    const reminder = JSON.parse(String(settingMap.reminder)) as { enabled?: unknown; days?: unknown; time?: unknown };
    const headers = JSON.parse(String(settingMap.header_defaults)) as {
      trainingOfMode?: unknown; trainingOf?: unknown; block?: unknown; mesocycle?: unknown; microcycle?: unknown;
    };
    if (typeof reminder.enabled !== "boolean" || !Array.isArray(reminder.days) ||
      !reminder.days.every((day) => Number.isInteger(day) && day >= 0 && day <= 6) ||
      typeof reminder.time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(reminder.time) ||
      !["global", "perDay", "none"].includes(String(headers.trainingOfMode)) ||
      typeof headers.trainingOf !== "string" ||
      ![headers.block, headers.mesocycle, headers.microcycle].every((value) => typeof value === "number" && Number.isFinite(value))) {
      throw new Error();
    }
  } catch {
    throw new Error("Los ajustes de la copia no son válidos.");
  }

  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    const deleteOrder: BackupTable[] = [
      "performance_records", "workout_sets", "session_exercises", "sessions",
      "body_measurements", "routine_schedule", "routine_exercises", "routines", "exercise_library", "app_settings"
    ];
    for (const table of deleteOrder) await db.runAsync(`DELETE FROM ${table}`);
    const insertOrder: BackupTable[] = [
      "app_settings", "exercise_library", "routines", "routine_schedule", "routine_exercises", "sessions",
      "session_exercises", "workout_sets", "body_measurements", "performance_records"
    ];
    for (const table of insertOrder) {
      const columns = BACKUP_TABLES[table] as readonly string[];
      const placeholders = columns.map(() => "?").join(", ");
      const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`;
      for (const row of prepared[table]) {
        await db.runAsync(sql, ...columns.map((column) => row[column]));
      }
    }
  });
}
