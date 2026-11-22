import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useColorScheme,
  View
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NestableDraggableFlatList, NestableScrollContainer } from "react-native-draggable-flatlist";
import {
  addSessionExercise,
  addWorkoutSet,
  beginSession,
  createManualPerformance,
  deleteRoutine,
  deleteSession,
  deleteSessionExercise,
  deleteWorkoutSet,
  exportDatabaseBackup,
  finishSession,
  getActiveSession,
  getPlannedWorkoutCount,
  getSettings,
  getWeekStart,
  importDatabaseBackup,
  listExerciseProgress,
  listExerciseLibrary,
  listMeasurements,
  listPersonalRecords,
  listPerformanceRecords,
  listProgressExerciseNames,
  listRecentSessions,
  listRoutines,
  listSessionsForWeek,
  listWeeklyMuscleVolume,
  listWeeklySessionCounts,
  restoreWorkoutSet,
  saveMeasurement,
  saveExerciseLibraryEntry,
  saveRoutine,
  setSetting,
  updateSessionContext,
  updateSessionNotes,
  updateWorkoutSet,
  type ExerciseTemplate,
  type ExerciseProgressPoint,
  type ExerciseLibraryEntry,
  type Measurement,
  type PersonalRecord,
  type PerformanceRecord,
  type Routine,
  type SessionContext,
  type WorkoutSession,
  type WorkoutSet,
  type WeeklyMuscleVolume,
  type WeeklySessionCount
} from "./src/database";

type Screen = "Inicio" | "Rutinas" | "Entrenar" | "Sesiones" | "Progreso" | "Ajustes";
type ModalKind = "routine" | "exercise" | "measure" | "performance" | "freeExercise" | "group" | "library" | null;
type ProgressRange = "week" | "month" | "custom" | "all";
type ProgressMetric = "weight" | "reps" | "volume";
type HeaderDefaults = {
  trainingOfMode: "global" | "perDay" | "none";
  trainingOf: string;
  block: number;
  mesocycle: number;
  microcycle: number;
};

const LIGHT_COLORS = {
  ink: "#17211d",
  muted: "#626e65",
  line: "#e5ebe6",
  paper: "#f5f8f5",
  white: "#ffffff",
  green: "#20734b",
  darkGreen: "#173c2a",
  softGreen: "#e6f4eb",
  lime: "#d7f36a",
  red: "#a84640",
  pale: "#eff4ef",
  dangerSurface: "#fff1ef",
  dangerBorder: "#f2d9d6",
  softTrack: "#eaf0eb",
  textOnDark: "#d0dfd3",
  subtleLine: "#f0f3f0",
  neutral: "#626e65",
  selectedBorder: "#b8dbc2",
  chartBar: "#c5decf",
  handle: "#626e65",
  surfaceSubtle: "#fbfdfb",
  secondaryText: "#56645a",
  inputSurface: "#f1f5f1",
  checkboxBorder: "#cfd8d0",
  workoutSubtle: "#597260",
  previousSurface: "#f3f7f3",
  previousText: "#526158",
  restButton: "#2b563a",
  shadow: "#11291b",
  fieldLabel: "#56645a",
  chartChangeDown: "#446f51",
  statusBar: "dark" as "dark" | "light",
  placeholder: "#626e65",
  onPrimary: "#ffffff",
  onDark: "#ffffff"
};
const DARK_COLORS: typeof LIGHT_COLORS = {
  ink: "#edf4ee",
  muted: "#a6b5aa",
  line: "#34473a",
  paper: "#101813",
  white: "#1b271f",
  green: "#75c993",
  darkGreen: "#163d27",
  softGreen: "#223c2b",
  lime: "#d7f36a",
  red: "#f08c83",
  pale: "#202c23",
  dangerSurface: "#422a28",
  dangerBorder: "#65403b",
  softTrack: "#2c3a30",
  textOnDark: "#d0dfd3",
  subtleLine: "#2b382e",
  neutral: "#a6b5aa",
  selectedBorder: "#456c50",
  chartBar: "#47644f",
  handle: "#a6b5aa",
  surfaceSubtle: "#202d24",
  secondaryText: "#b1beb4",
  inputSurface: "#26332a",
  checkboxBorder: "#526456",
  workoutSubtle: "#b5c5b8",
  previousSurface: "#202d24",
  previousText: "#c0cec3",
  restButton: "#2b563a",
  shadow: "#000000",
  fieldLabel: "#b4c1b6",
  chartChangeDown: "#f08c83",
  statusBar: "light",
  placeholder: "#a6b5aa",
  onPrimary: "#102017",
  onDark: "#edf4ee"
};
const ThemeContext = createContext(LIGHT_COLORS);
const WEEKDAYS = [
  { index: 1, title: "Lunes", short: "Lun" },
  { index: 2, title: "Martes", short: "Mar" },
  { index: 3, title: "Miércoles", short: "Mié" },
  { index: 4, title: "Jueves", short: "Jue" },
  { index: 5, title: "Viernes", short: "Vie" },
  { index: 6, title: "Sábado", short: "Sáb" },
  { index: 0, title: "Domingo", short: "Dom" }
];
const ENERGY_LEVELS = ["Muy baja", "Baja", "Normal", "Alta", "Muy alta"];
const EMPTY_HEADER: HeaderDefaults = {
  trainingOfMode: "global", trainingOf: "General", block: 1, mesocycle: 1, microcycle: 1
};
const MEASURE_FIELDS: Array<{ key: keyof Measurement; label: string; unit: string }> = [
  { key: "weight", label: "Peso corporal", unit: "kg" },
  { key: "bodyFat", label: "Grasa corporal", unit: "%" },
  { key: "chest", label: "Pecho", unit: "cm" },
  { key: "shoulders", label: "Hombros", unit: "cm" },
  { key: "rightArm", label: "Brazo derecho", unit: "cm" },
  { key: "leftArm", label: "Brazo izquierdo", unit: "cm" },
  { key: "waist", label: "Cintura", unit: "cm" },
  { key: "hips", label: "Cadera", unit: "cm" },
  { key: "rightThigh", label: "Muslo derecho", unit: "cm" },
  { key: "leftThigh", label: "Muslo izquierdo", unit: "cm" },
  { key: "rightCalf", label: "Pantorrilla derecha", unit: "cm" },
  { key: "leftCalf", label: "Pantorrilla izquierda", unit: "cm" }
];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

function makeId(): string {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDate(value: string, options?: Intl.DateTimeFormatOptions): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  return new Intl.DateTimeFormat("es", options || { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function localDateString(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isValidDateInput(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() === Number(match[2]) - 1 &&
    date.getUTCDate() === Number(match[3]);
}

function weekdayName(day: number): string {
  return WEEKDAYS.find((item) => item.index === day)?.title || "Día";
}

function displayNumber(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
  return new Intl.NumberFormat("es", { maximumFractionDigits: digits }).format(Number(value));
}

function csvRow(values: Array<string | number | null | undefined>): string {
  return values.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",");
}

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character] || character);
}

function formatDuration(startedAt: string, endedAt: string | null): string {
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  const minutes = Math.max(0, Math.floor((end - new Date(startedAt).getTime()) / 60_000));
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours} h ${minutes % 60} min` : `${minutes} min`;
}

function sessionDuration(session: WorkoutSession): string {
  if (session.status !== "in_progress" && !session.endedAt) return "No disponible";
  return formatDuration(session.startedAt, session.endedAt);
}

function parseOptionalDecimal(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value.trim().replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function bestSet(sets: WorkoutSet[]): WorkoutSet | null {
  return sets.filter((set) => set.weight !== null && set.reps !== null)
    .reduce<WorkoutSet | null>((best, set) => {
      if (!best || (set.weight || 0) > (best.weight || 0) ||
        ((set.weight || 0) === (best.weight || 0) && (set.reps || 0) > (best.reps || 0))) return set;
      return best;
    }, null);
}

function exerciseGroupLabel(exercises: ExerciseTemplate[], exercise: ExerciseTemplate): string | null {
    if (!exercise.groupId || !exercise.groupType) return null;
    const groupIds = [...new Set(exercises.filter((item) => item.groupType === exercise.groupType)
      .map((item) => item.groupId).filter((id): id is string => Boolean(id)))];
    const groupNumber = groupIds.indexOf(exercise.groupId) + 1;
    return `${exercise.groupType === "superset" ? "Superset" : "Circuito"} ${groupNumber}`;
}

function useThemeStyles() {
  const COLORS = useContext(ThemeContext);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  return { COLORS, styles };
}

function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  const { styles } = useThemeStyles();
  return <View style={[styles.card, style]}>{children}</View>;
}

function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const { styles } = useThemeStyles();
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && onAction ? <Pressable onPress={onAction}><Text style={styles.actionText}>{action}</Text></Pressable> : null}
    </View>
  );
}

function Button({
  title, onPress, variant = "primary", small = false, disabled = false
}: {
  title: string; onPress: () => void; variant?: "primary" | "secondary" | "danger"; small?: boolean; disabled?: boolean;
}) {
  const { styles } = useThemeStyles();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[
      styles.button,
      variant === "secondary" && styles.buttonSecondary,
      variant === "danger" && styles.buttonDanger,
      small && styles.buttonSmall,
      disabled && styles.buttonDisabled
    ]}>
      <Text style={[
        styles.buttonText,
        variant === "secondary" && styles.buttonSecondaryText,
        variant === "danger" && styles.buttonDangerText
      ]}>{title}</Text>
    </Pressable>
  );
}

function Field({
  label, value, onChangeText, placeholder, keyboardType = "default", multiline = false, suffix, onBlur
}: {
  label: string; value: string; onChangeText: (text: string) => void; placeholder?: string;
  keyboardType?: "default" | "numeric" | "decimal-pad"; multiline?: boolean; suffix?: string; onBlur?: () => void;
}) {
  const { COLORS, styles } = useThemeStyles();
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          accessibilityLabel={label}
          placeholder={placeholder}
          placeholderTextColor={COLORS.placeholder}
          keyboardType={keyboardType}
          multiline={multiline}
          onBlur={onBlur}
          style={[styles.input, multiline && styles.textArea, suffix && styles.inputWithSuffix]}
        />
        {suffix ? <Text style={styles.inputSuffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

function SetLine({
  set, previousSet, onSave, onCopy, onDelete, onComplete, weightUnit
}: {
  set: WorkoutSet; previousSet?: WorkoutSet; onSave: (set: WorkoutSet) => Promise<void>;
  onCopy?: () => void; onDelete: () => void;
  onComplete: (set: WorkoutSet) => void; weightUnit: string;
}) {
  const { COLORS, styles } = useThemeStyles();
  const [weight, setWeight] = useState(set.weight === null ? "" : String(set.weight));
  const [reps, setReps] = useState(set.reps === null ? "" : String(set.reps));
  const [rir, setRir] = useState(set.rir === null ? "" : String(set.rir));
  const [rest, setRest] = useState(String(set.restSeconds));
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updatedSet = () => ({
    ...set,
    weight: weight === "" ? null : Number(weight),
    reps: reps === "" ? null : Number(reps),
    rir: rir === "" ? null : Number(rir),
    restSeconds: Math.max(0, Number(rest) || 0)
  });
  const reportSaveError = (caught: unknown) => {
    Alert.alert("No se pudo guardar la serie", caught instanceof Error ? caught.message : "Inténtalo de nuevo.");
  };
  const save = () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    void onSave(updatedSet()).catch(reportSaveError);
  };
  useEffect(() => {
    const unchanged = weight === (set.weight === null ? "" : String(set.weight)) &&
      reps === (set.reps === null ? "" : String(set.reps)) &&
      rir === (set.rir === null ? "" : String(set.rir)) && rest === String(set.restSeconds);
    if (unchanged) return;
    autoSaveTimer.current = setTimeout(() => {
      void onSave(updatedSet()).catch(reportSaveError);
    }, 450);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [weight, reps, rir, rest, set.id, set.weight, set.reps, set.rir, set.restSeconds]);
  return (
    <View style={styles.setEntry}>
      <View style={styles.setEntryHeader}>
        <View style={styles.setBadge}><Text style={styles.setBadgeText}>{set.setNumber}</Text></View>
        <Text style={styles.setEntryTitle}>Serie {set.setNumber}</Text>
        {previousSet && onCopy ? <Pressable accessibilityRole="button" onPress={onCopy} style={styles.copySetButton}>
          <Text style={styles.copySetText}>Copiar anterior</Text>
        </Pressable> : null}
        <Pressable accessibilityLabel={`Eliminar serie ${set.setNumber}`} onPress={onDelete} style={styles.removeSetButton}>
          <Text style={styles.removeSetText}>×</Text>
        </Pressable>
      </View>
      <View style={styles.setFields}>
        <View style={styles.setField}>
          <Text style={styles.setFieldLabel}>{weightUnit.toLocaleUpperCase("es")}</Text>
          <TextInput accessibilityLabel={`Peso de la serie ${set.setNumber}`} value={weight} onChangeText={setWeight} onBlur={save}
            keyboardType="decimal-pad" placeholder="0" style={styles.setInput} />
        </View>
        <View style={styles.setField}>
          <Text style={styles.setFieldLabel}>REPS</Text>
          <TextInput accessibilityLabel={`Repeticiones de la serie ${set.setNumber}`} value={reps} onChangeText={setReps} onBlur={save}
            keyboardType="number-pad" placeholder="0" style={styles.setInput} />
        </View>
        <View style={styles.setField}>
          <Text style={styles.setFieldLabel}>RIR</Text>
          <TextInput accessibilityLabel={`RIR de la serie ${set.setNumber}`} value={rir} onChangeText={setRir} onBlur={save}
            keyboardType="decimal-pad" placeholder="—" style={styles.setInput} />
        </View>
        <View style={styles.setField}>
          <Text style={styles.setFieldLabel}>DESCANSO</Text>
          <TextInput accessibilityLabel={`Descanso de la serie ${set.setNumber} en segundos`} value={rest} onChangeText={setRest} onBlur={save}
            keyboardType="number-pad" style={styles.setInput} />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Guardar serie ${set.setNumber} e iniciar descanso`}
          style={styles.checkButton} onPress={() => {
            const updated = updatedSet();
            void onSave(updated).then(() => onComplete(updated)).catch(reportSaveError);
          }}>
          <Text style={styles.checkText}>✓</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function App() {
  const colorScheme = useColorScheme();
  const COLORS = colorScheme === "dark" ? DARK_COLORS : LIGHT_COLORS;
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [screen, setScreen] = useState<Screen>("Inicio");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [exerciseLibrary, setExerciseLibrary] = useState<ExerciseLibraryEntry[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [weekSessions, setWeekSessions] = useState<WorkoutSession[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [records, setRecords] = useState<PerformanceRecord[]>([]);
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>([]);
  const [weeklyMuscleVolume, setWeeklyMuscleVolume] = useState<WeeklyMuscleVolume[]>([]);
  const [weeklySessionCounts, setWeeklySessionCounts] = useState<WeeklySessionCount[]>([]);
  const [plannedWorkoutCount, setPlannedWorkoutCount] = useState(0);
  const [progressExercises, setProgressExercises] = useState<string[]>([]);
  const [selectedProgressExercise, setSelectedProgressExercise] = useState("");
  const [progressRange, setProgressRange] = useState<ProgressRange>("month");
  const [progressRangeStartInput, setProgressRangeStartInput] = useState(`${localDateString().slice(0, 7)}-01`);
  const [progressRangeEndInput, setProgressRangeEndInput] = useState(localDateString());
  const [progressMetric, setProgressMetric] = useState<ProgressMetric>("weight");
  const [exerciseProgress, setExerciseProgress] = useState<ExerciseProgressPoint[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState("");
  const [active, setActive] = useState<WorkoutSession | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [profileName, setProfileName] = useState("");
  const [profileTrainingDays, setProfileTrainingDays] = useState<number[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingName, setOnboardingName] = useState("");
  const [onboardingWeight, setOnboardingWeight] = useState("");
  const [onboardingSystem, setOnboardingSystem] = useState<"metric" | "imperial">("metric");
  const [onboardingDays, setOnboardingDays] = useState<number[]>([]);
  const [onboardingSaving, setOnboardingSaving] = useState(false);
  const [modal, setModal] = useState<ModalKind>(null);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [libraryExerciseId, setLibraryExerciseId] = useState<string | null>(null);
  const [libraryRoutineId, setLibraryRoutineId] = useState<string | null>(null);
  const [libraryUseForSession, setLibraryUseForSession] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryMuscleFilter, setLibraryMuscleFilter] = useState("");
  const [libraryFormOpen, setLibraryFormOpen] = useState(false);
  const [libraryEditingId, setLibraryEditingId] = useState<string | null>(null);
  const [libraryName, setLibraryName] = useState("");
  const [libraryMuscleGroup, setLibraryMuscleGroup] = useState("");
  const [libraryEquipment, setLibraryEquipment] = useState("");
  const [libraryInstructions, setLibraryInstructions] = useState("");
  const [libraryAlternatives, setLibraryAlternatives] = useState("");
  const [groupRoutineId, setGroupRoutineId] = useState<string | null>(null);
  const [groupSelectedIds, setGroupSelectedIds] = useState<string[]>([]);
  const [groupType, setGroupType] = useState<"superset" | "circuit">("superset");
  const [editMeasurement, setEditMeasurement] = useState<Measurement | null>(null);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [routineName, setRoutineName] = useState("");
  const [routineNotes, setRoutineNotes] = useState("");
  const [exerciseName, setExerciseName] = useState("");
  const [targetSets, setTargetSets] = useState("3");
  const [minReps, setMinReps] = useState("8");
  const [maxReps, setMaxReps] = useState("12");
  const [targetRir, setTargetRir] = useState("2");
  const [restSeconds, setRestSeconds] = useState("90");
  const [measureValues, setMeasureValues] = useState<Record<string, string>>({});
  const [performanceWeight, setPerformanceWeight] = useState("");
  const [performanceReps, setPerformanceReps] = useState("");
  const [performanceExercise, setPerformanceExercise] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [energyRating, setEnergyRating] = useState<number | null>(null);
  const [sleepHoursInput, setSleepHoursInput] = useState("");
  const [waterMlInput, setWaterMlInput] = useState("");
  const [discomfortInput, setDiscomfortInput] = useState("");
  const [supplementsInput, setSupplementsInput] = useState("");
  const [sessionContextExpanded, setSessionContextExpanded] = useState(false);
  const [sessionContextError, setSessionContextError] = useState("");
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [, setElapsedMinuteTick] = useState(0);
  const [focusedExerciseIndex, setFocusedExerciseIndex] = useState(0);
  const [undoSetSnapshot, setUndoSetSnapshot] = useState<{ exerciseId: string; set: WorkoutSet } | null>(null);
  const [toast, setToast] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("18:00");
  const [headerDefaults, setHeaderDefaults] = useState<HeaderDefaults>(EMPTY_HEADER);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const weightUnit = settings.system === "imperial" ? "lb" : "kg";
  const lengthUnit = settings.system === "imperial" ? "in" : "cm";
  const progressDateBounds = useMemo(() => {
    const today = localDateString();
    if (progressRange === "week") return { startDate: getWeekStart(), endDate: today };
    if (progressRange === "month") return { startDate: `${today.slice(0, 7)}-01`, endDate: today };
    if (progressRange === "custom") return { startDate: progressRangeStartInput, endDate: progressRangeEndInput };
    return { startDate: null, endDate: null };
  }, [progressRange, progressRangeStartInput, progressRangeEndInput]);
  const todayRoutine = useMemo(() => routines.find((routine) => routine.days.includes(new Date().getDay())) || null, [routines]);
  const lastMeasure = measurements[0] || null;

  function notify(message: string) {
    setUndoSetSnapshot(null);
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToast("");
      setUndoSetSnapshot(null);
    }, 2600);
  }

  function notifyUndo(message: string, snapshot: { exerciseId: string; set: WorkoutSet }) {
    setToast(message);
    setUndoSetSnapshot(snapshot);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToast("");
      setUndoSetSnapshot(null);
    }, 5000);
  }

  async function refresh() {
    const firstAnalyticsWeek = new Date(`${getWeekStart()}T12:00:00`);
    firstAnalyticsWeek.setDate(firstAnalyticsWeek.getDate() - 7 * 7);
    const analyticsStartDate = localDateString(firstAnalyticsWeek);
    const [routineList, recent, thisWeek, measurementList, performanceList, current, savedSettings, exerciseNames, library,
      recordList, muscleVolume, sessionCounts, plannedCount] = await Promise.all([
      listRoutines(), listRecentSessions(), listSessionsForWeek(), listMeasurements(), listPerformanceRecords(),
      getActiveSession(), getSettings(), listProgressExerciseNames(), listExerciseLibrary(),
      listPersonalRecords(), listWeeklyMuscleVolume(analyticsStartDate), listWeeklySessionCounts(analyticsStartDate),
      getPlannedWorkoutCount()
    ]);
    setRoutines(routineList);
    setExerciseLibrary(library);
    setSessions(recent);
    setWeekSessions(thisWeek);
    setMeasurements(measurementList);
    setRecords(performanceList);
    setPersonalRecords(recordList);
    setWeeklyMuscleVolume(muscleVolume);
    setWeeklySessionCounts(sessionCounts);
    setPlannedWorkoutCount(plannedCount);
    setProgressExercises(exerciseNames);
    setSelectedProgressExercise((currentName) => exerciseNames.find((name) =>
      name.toLocaleLowerCase("es") === currentName.toLocaleLowerCase("es")) || exerciseNames[0] || "");
    setActive(current);
    setSettings(savedSettings);
    const profile = JSON.parse(savedSettings.profile || "null") as { name?: unknown; trainingDays?: unknown } | null;
    if (profile && typeof profile.name === "string" && profile.name.trim()) {
      setProfileName(profile.name);
      setProfileTrainingDays(Array.isArray(profile.trainingDays)
        ? profile.trainingDays.filter((day): day is number => Number.isInteger(day) && day >= 0 && day <= 6)
        : []);
      setOnboardingName(profile.name);
      setOnboardingSystem(savedSettings.system === "imperial" ? "imperial" : "metric");
      setShowOnboarding(false);
    } else {
      setOnboardingSystem(savedSettings.system === "imperial" ? "imperial" : "metric");
      setShowOnboarding(true);
    }
    setReminderEnabled(JSON.parse(savedSettings.reminder || '{"enabled":false}').enabled);
    setReminderTime(JSON.parse(savedSettings.reminder || '{"time":"18:00"}').time || "18:00");
    setHeaderDefaults({ ...EMPTY_HEADER, ...JSON.parse(savedSettings.header_defaults || "{}") });
  }

  function readSessionContext(): { context: SessionContext | null; error: string } {
    const sleepText = sleepHoursInput.trim();
    const waterText = waterMlInput.trim();
    const sleepHours = parseOptionalDecimal(sleepText);
    const waterMl = parseOptionalDecimal(waterText);
    if (sleepText && (!/^\d+(?:[.,]\d+)?$/.test(sleepText) || sleepHours === null || sleepHours > 24)) {
      return { context: null, error: "El sueño debe estar entre 0 y 24 horas." };
    }
    if (waterText && (!/^\d+$/.test(waterText) || waterMl === null || !Number.isInteger(waterMl))) {
      return { context: null, error: "El agua debe indicarse como un número entero de mililitros." };
    }
    return {
      context: {
        energyRating,
        sleepHours,
        discomfortNotes: discomfortInput.trim(),
        waterMl,
        supplements: supplementsInput.trim()
      },
      error: ""
    };
  }

  useEffect(() => {
    refresh().catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "No se pudo abrir la base local."))
      .finally(() => setBusy(false));
    return () => { if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, []);

  useEffect(() => {
    setFocusedExerciseIndex(0);
  }, [active?.id]);

  useEffect(() => {
    setEnergyRating(active?.energyRating ?? null);
    setSleepHoursInput(active?.sleepHours === null || active?.sleepHours === undefined ? "" : String(active.sleepHours));
    setWaterMlInput(active?.waterMl === null || active?.waterMl === undefined ? "" : String(active.waterMl));
    setDiscomfortInput(active?.discomfortNotes || "");
    setSupplementsInput(active?.supplements || "");
    setSessionContextError("");
    setSessionContextExpanded(false);
  }, [active?.id]);

  useEffect(() => {
    if (!active) return;
    const { context, error: validationError } = readSessionContext();
    if (!context) {
      setSessionContextError(validationError);
      return;
    }
    setSessionContextError("");
    const timer = setTimeout(() => {
      void updateSessionContext(active.id, context).catch((caught: unknown) => {
        setSessionContextError(caught instanceof Error ? caught.message : "No se pudo guardar el contexto de la sesión.");
        setSessionContextExpanded(true);
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [active?.id, energyRating, sleepHoursInput, waterMlInput, discomfortInput, supplementsInput]);

  useEffect(() => {
    if (!active || screen !== "Entrenar") return;
    const timer = setInterval(() => setElapsedMinuteTick((tick) => tick + 1), 60_000);
    return () => clearInterval(timer);
  }, [active?.id, screen]);

  useEffect(() => {
    if (screen !== "Progreso" || !selectedProgressExercise) return;
    const { startDate, endDate } = progressDateBounds;
    if ((startDate && !isValidDateInput(startDate)) || (endDate && !isValidDateInput(endDate))) {
      setProgressError("Usa fechas válidas con formato AAAA-MM-DD.");
      setExerciseProgress([]);
      setProgressLoading(false);
      return;
    }
    if (startDate && endDate && startDate > endDate) {
      setProgressError("La fecha inicial debe ser anterior o igual a la fecha final.");
      setExerciseProgress([]);
      setProgressLoading(false);
      return;
    }
    setProgressError("");
    setProgressLoading(true);
    let current = true;
    void listExerciseProgress(selectedProgressExercise, startDate, endDate)
      .then((points) => { if (current) setExerciseProgress(points); })
      .catch((caught: unknown) => {
        if (current) setProgressError(caught instanceof Error ? caught.message : "No se pudo cargar el progreso.");
      })
      .finally(() => { if (current) setProgressLoading(false); });
    return () => { current = false; };
  }, [screen, selectedProgressExercise, progressDateBounds.startDate, progressDateBounds.endDate]);

  useEffect(() => {
    if (secondsRemaining === null) return;
    const timer = setInterval(() => {
      setSecondsRemaining((value) => {
        if (value === null || value <= 1) {
          clearInterval(timer);
          if (value !== null) notify("Descanso terminado. ¡A por la siguiente serie!");
          return null;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsRemaining === null]);

  async function run(action: () => Promise<void>, success?: string) {
    try {
      await action();
      await refresh();
      if (success) notify(success);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Ocurrió un error inesperado.";
      setError(message);
      Alert.alert("No se pudo completar", message);
    }
  }

  async function completeOnboarding() {
    const name = onboardingName.trim();
    const weight = onboardingWeight.trim() === "" ? null : Number(onboardingWeight);
    if (!name) {
      Alert.alert("Falta tu nombre", "Escribe cómo quieres que te llamemos en la app.");
      return;
    }
    if (weight !== null && (!Number.isFinite(weight) || weight <= 0)) {
      Alert.alert("Revisa el peso", "El peso debe ser un número mayor que cero, o puedes dejarlo en blanco.");
      return;
    }
    setOnboardingSaving(true);
    try {
      await setSetting("system", onboardingSystem);
      await setSetting("profile", JSON.stringify({ name, trainingDays: onboardingDays }));
      if (weight !== null) {
        const now = new Date();
        const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        await saveMeasurement({
          id: makeId(), date, weekStart: getWeekStart(), weight, bodyFat: null, chest: null, shoulders: null,
          rightArm: null, leftArm: null, waist: null, hips: null, rightThigh: null, leftThigh: null,
          rightCalf: null, leftCalf: null
        });
      }
      await refresh();
    } catch (caught) {
      Alert.alert("No se pudo guardar tu perfil", caught instanceof Error ? caught.message : "Inténtalo de nuevo.");
    } finally {
      setOnboardingSaving(false);
    }
  }

  async function saveProfile() {
    const name = profileName.trim();
    if (!name) {
      Alert.alert("Falta tu nombre", "El nombre del perfil no puede quedar vacío.");
      return;
    }
    await run(async () => {
      await setSetting("profile", JSON.stringify({ name, trainingDays: profileTrainingDays }));
    }, "Perfil actualizado.");
  }

  function openRoutine(routine?: Routine) {
    setEditingRoutineId(routine?.id || null);
    setRoutineName(routine?.name || "");
    setRoutineNotes(routine?.notes || "");
    setSelectedDays(routine?.days || []);
    setModal("routine");
  }

  function openExercise(routineId: string, exercise?: ExerciseTemplate) {
    setEditingRoutineId(routineId);
    setEditingExerciseId(exercise?.id || null);
    setLibraryExerciseId(exercise?.libraryExerciseId || null);
    setExerciseName(exercise?.name || "");
    setTargetSets(String(exercise?.targetSets || 3));
    setMinReps(String(exercise?.minReps || 8));
    setMaxReps(String(exercise?.maxReps || 12));
    setTargetRir(String(exercise?.targetRir ?? 2));
    setRestSeconds(String(exercise?.restSeconds || 90));
    setModal("exercise");
  }

  function changeExerciseName(name: string) {
    setExerciseName(name);
    const selected = exerciseLibrary.find((entry) => entry.id === libraryExerciseId);
    if (selected && selected.name !== name.trim()) setLibraryExerciseId(null);
  }

  function openExerciseLibrary(routineId: string | null = null, useForSession = false) {
    setLibraryRoutineId(routineId);
    setLibraryUseForSession(useForSession);
    setLibrarySearch("");
    setLibraryMuscleFilter("");
    setLibraryFormOpen(false);
    setModal("library");
  }

  function closeExerciseLibrary() {
    const targetModal = libraryRoutineId ? "exercise" : libraryUseForSession ? "freeExercise" : null;
    setModal(targetModal);
    setLibraryRoutineId(null);
    setLibraryUseForSession(false);
  }

  function openLibraryForm(entry?: ExerciseLibraryEntry) {
    setLibraryEditingId(entry?.id || null);
    setLibraryName(entry?.name || "");
    setLibraryMuscleGroup(entry?.muscleGroup || "");
    setLibraryEquipment(entry?.equipment || "");
    setLibraryInstructions(entry?.instructions || "");
    setLibraryAlternatives(entry?.alternatives || "");
    setLibraryFormOpen(true);
  }

  function selectLibraryEntry(entry: ExerciseLibraryEntry) {
    const targetRoutineId = libraryRoutineId;
    const useForSession = libraryUseForSession;
    setLibraryExerciseId(entry.id);
    setExerciseName(entry.name);
    if (targetRoutineId) {
      setEditingRoutineId(targetRoutineId);
      setModal("exercise");
    } else if (useForSession) {
      setModal("freeExercise");
    }
    setLibraryRoutineId(null);
    setLibraryUseForSession(false);
  }

  async function persistLibraryEntry() {
    if (!libraryName.trim() || !libraryMuscleGroup.trim()) {
      notify("Indica el nombre del ejercicio y su grupo muscular.");
      return;
    }
    const selectAfterCreate = !libraryEditingId && Boolean(libraryRoutineId || libraryUseForSession);
    const entry: ExerciseLibraryEntry = {
      id: libraryEditingId || makeId(),
      name: libraryName.trim(),
      muscleGroup: libraryMuscleGroup.trim(),
      equipment: libraryEquipment.trim(),
      instructions: libraryInstructions.trim(),
      alternatives: libraryAlternatives.trim(),
      isCustom: libraryEditingId
        ? exerciseLibrary.find((item) => item.id === libraryEditingId)?.isCustom ?? true
        : true
    };
    await run(async () => {
      await saveExerciseLibraryEntry(entry);
      setLibraryFormOpen(false);
      setLibraryEditingId(null);
      if (selectAfterCreate) selectLibraryEntry(entry);
    }, "Ejercicio guardado en la biblioteca.");
  }

  async function persistRoutine() {
    const routine: Routine = {
      id: editingRoutineId || makeId(),
      name: routineName.trim(),
      notes: routineNotes.trim(),
      days: selectedDays,
      exercises: routines.find((item) => item.id === editingRoutineId)?.exercises || []
    };
    if (!routine.name) { notify("Escribe un nombre para la rutina."); return; }
    await run(async () => {
      const existing = routines.find((item) => item.id === routine.id);
      const conflicting = routines.filter((item) => item.id !== routine.id && item.days.some((day) => routine.days.includes(day)));
      const reassigned = routines.map((item) => conflicting.some((other) => other.id === item.id)
        ? { ...item, days: item.days.filter((day) => !routine.days.includes(day)) }
        : item);
      for (const item of reassigned) {
        if (item.id === routine.id) continue;
        if (conflicting.some((other) => other.id === item.id)) await saveRoutine(item);
      }
      await saveRoutine({ ...routine, exercises: existing?.exercises || routine.exercises });
      setModal(null);
    }, "Rutina guardada.");
  }

  async function persistExercise() {
    const min = Number(minReps), max = Number(maxReps);
    if (!exerciseName.trim() || !Number.isInteger(Number(targetSets)) || Number(targetSets) < 1 || min < 1 || max < min) {
      notify("Revisa nombre, series y rango de repeticiones.");
      return;
    }
    const routine = routines.find((item) => item.id === editingRoutineId);
    if (!routine) return;
    const existingExercise = routine.exercises.find((item) => item.id === editingExerciseId);
    const selectedLibrary = exerciseLibrary.find((item) => item.id === libraryExerciseId);
    const exercise: ExerciseTemplate = {
      id: editingExerciseId || makeId(),
      name: exerciseName.trim(),
      libraryExerciseId: selectedLibrary?.name === exerciseName.trim() ? libraryExerciseId : null,
      targetSets: Number(targetSets),
      minReps: min,
      maxReps: max,
      targetRir: Number(targetRir) || 0,
      restSeconds: Math.max(15, Number(restSeconds) || 90),
      groupId: existingExercise?.groupId ?? null,
      groupType: existingExercise?.groupType ?? null
    };
    const exercises = editingExerciseId
      ? routine.exercises.map((item) => item.id === editingExerciseId ? exercise : item)
      : [...routine.exercises, exercise];
    await run(async () => {
      await saveRoutine({ ...routine, exercises });
      setModal(null);
    }, "Ejercicio guardado.");
  }

  function openExerciseGrouping(routine: Routine) {
    setGroupRoutineId(routine.id);
    setGroupSelectedIds([]);
    setGroupType("superset");
    setModal("group");
  }

  async function persistExerciseGrouping() {
    const routine = routines.find((item) => item.id === groupRoutineId);
    if (!routine || groupSelectedIds.length < 2) {
      notify("Selecciona al menos dos ejercicios para crear un grupo.");
      return;
    }
    const selected = new Set(groupSelectedIds);
    const replacedGroups = new Set(routine.exercises
      .filter((exercise) => selected.has(exercise.id))
      .map((exercise) => exercise.groupId)
      .filter((groupId): groupId is string => Boolean(groupId)));
    const groupId = makeId();
    const exercises = routine.exercises.map((exercise) => {
      if (selected.has(exercise.id)) return { ...exercise, groupId, groupType };
      if (exercise.groupId && replacedGroups.has(exercise.groupId)) return { ...exercise, groupId: null, groupType: null };
      return exercise;
    });
    await run(async () => {
      await saveRoutine({ ...routine, exercises });
      setModal(null);
    }, groupType === "superset" ? "Superserie creada." : "Circuito creado.");
  }

  async function clearExerciseGrouping(routine: Routine, groupId: string) {
    await run(() => saveRoutine({
      ...routine,
      exercises: routine.exercises.map((exercise) =>
        exercise.groupId === groupId ? { ...exercise, groupId: null, groupType: null } : exercise)
    }), "Grupo eliminado.");
  }

  async function duplicateRoutine(routine: Routine) {
    const groupIds = new Map<string, string>();
    const copy: Routine = {
      ...routine,
      id: makeId(),
      name: `${routine.name} (copia)`,
      days: [],
      exercises: routine.exercises.map((exercise) => {
        const groupId = exercise.groupId
          ? groupIds.get(exercise.groupId) || makeId()
          : null;
        if (exercise.groupId && groupId) groupIds.set(exercise.groupId, groupId);
        return { ...exercise, id: makeId(), groupId };
      })
    };
    try {
      await saveRoutine(copy);
      await refresh();
      openRoutine(copy);
      notify("Copia creada. Asígnale los días que prefieras.");
    } catch (caught) {
      Alert.alert("No se pudo duplicar la rutina", caught instanceof Error ? caught.message : "Inténtalo de nuevo.");
    }
  }

  async function startWorkout(routine: Routine | null) {
    if (active) {
      setScreen("Entrenar");
      return;
    }
    const reminder = JSON.parse(settings.reminder || "{}");
    const trainingOf = headerDefaults.trainingOfMode === "none" ? ""
      : headerDefaults.trainingOfMode === "perDay"
        ? reminder.trainingOfByDay?.[new Date().getDay()] || headerDefaults.trainingOf
        : headerDefaults.trainingOf;
    await run(async () => {
      await beginSession(routine, {
        trainingOf,
        block: headerDefaults.block,
        mesocycle: headerDefaults.mesocycle,
        microcycle: headerDefaults.microcycle
      });
      setScreen("Entrenar");
    }, "Sesión iniciada. Se guardará en este teléfono.");
  }

  async function saveSet(set: WorkoutSet) {
    await updateWorkoutSet(set);
    await refresh();
  }

  async function removeSetWithUndo(set: WorkoutSet, exerciseId: string) {
    try {
      await deleteWorkoutSet(set.id, exerciseId);
      await refresh();
      notifyUndo("Serie eliminada", { exerciseId, set });
    } catch (caught) {
      Alert.alert("No se pudo eliminar", caught instanceof Error ? caught.message : "Inténtalo de nuevo.");
    }
  }

  async function undoSetRemoval() {
    if (!undoSetSnapshot) return;
    const snapshot = undoSetSnapshot;
    setUndoSetSnapshot(null);
    try {
      await restoreWorkoutSet(snapshot.exerciseId, snapshot.set);
      await refresh();
      notify("Serie restaurada.");
    } catch (caught) {
      setUndoSetSnapshot(snapshot);
      Alert.alert("No se pudo restaurar la serie", caught instanceof Error ? caught.message : "Inténtalo de nuevo.");
    }
  }

  async function copyPreviousSet(set: WorkoutSet, previous: WorkoutSet) {
    await saveSet({
      ...set, weight: previous.weight, reps: previous.reps, rir: previous.rir,
      restSeconds: previous.restSeconds
    });
    notify(`Serie ${set.setNumber} copiada.`);
  }

  async function completeSet(set: WorkoutSet) {
    if (set.reps === null || set.reps < 1 || set.weight === null) {
      notify("Registra el peso y las repeticiones antes de completar la serie.");
      return;
    }
    setSecondsRemaining(set.restSeconds);
    try {
      await Notifications.setNotificationChannelAsync("rest", {
        name: "Descanso de series",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default"
      });
      await Notifications.scheduleNotificationAsync({
        content: { title: "Diario Fit", body: "Terminó tu descanso. ¡A por la siguiente serie!" },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: set.restSeconds, channelId: "rest" }
      });
    } catch {
      notify("Temporizador iniciado; el aviso del sistema no está disponible.");
    }
  }

  async function requestNotificationPermission() {
    const permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permiso pendiente", "Android no concedió las notificaciones. Puedes habilitarlas después en Ajustes del teléfono.");
      return false;
    }
    await Notifications.setNotificationChannelAsync("rest", {
      name: "Descanso de series",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default"
    });
    await Notifications.setNotificationChannelAsync("training", {
      name: "Entrenamientos",
      importance: Notifications.AndroidImportance.DEFAULT
    });
    return true;
  }

  async function synchronizeTrainingReminders(reminder: { enabled?: boolean; days?: number[]; time?: string }) {
    const time = reminder.time || "18:00";
    if (reminder.enabled && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error("Indica una hora válida en formato HH:MM.");
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(scheduled
      .filter((item) => item.content.data?.category === "training")
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)));
    if (!reminder.enabled) return;
    await Notifications.setNotificationChannelAsync("training", {
      name: "Entrenamientos",
      importance: Notifications.AndroidImportance.DEFAULT
    });
    const [hour, minute] = time.split(":").map(Number);
    for (const weekday of reminder.days || [1, 3, 5]) {
      if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Diario Fit",
          body: "Hoy toca entrenar. Tu rutina te espera.",
          data: { category: "training" }
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: weekday === 0 ? 1 : weekday + 1,
          hour, minute, channelId: "training"
        }
      });
    }
  }

  async function saveReminders(enabled: boolean, time = reminderTime, selectedDays?: number[]) {
    const reminder = JSON.parse(settings.reminder || '{"days":[1,3,5]}');
    reminder.enabled = enabled;
    reminder.time = time;
    if (selectedDays) reminder.days = selectedDays;
    if (enabled && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error("Indica una hora válida en formato HH:MM.");
    if (enabled && !await requestNotificationPermission()) {
      setReminderEnabled(false);
      return;
    }
    await synchronizeTrainingReminders(reminder);
    await setSetting("reminder", JSON.stringify(reminder));
    await refresh();
  }

  async function completeWorkout() {
    if (!active) return;
    const { context, error: validationError } = readSessionContext();
    if (!context) {
      setSessionContextError(validationError);
      setSessionContextExpanded(true);
      notify(validationError);
      return;
    }
    await run(async () => {
      await updateSessionContext(active.id, context);
      await updateSessionNotes(active.id, "", conclusion);
      await finishSession(active.id);
      setConclusion("");
      setSecondsRemaining(null);
      setScreen("Inicio");
    }, "Sesión completada y guardada.");
  }

  function openMeasurement(measurement?: Measurement) {
    setEditMeasurement(measurement || null);
    const values: Record<string, string> = {};
    MEASURE_FIELDS.forEach(({ key }) => {
      const value = measurement?.[key];
      values[String(key)] = value === null || value === undefined ? "" : String(value);
    });
    setMeasureValues(values);
    setModal("measure");
  }

  async function persistMeasurement() {
    if (!Object.values(measureValues).some((value) => value.trim() !== "")) {
      notify("Añade al menos una medida.");
      return;
    }
    const today = new Date();
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const measure: Measurement = {
      id: editMeasurement?.id || makeId(),
      date,
      weekStart: editMeasurement?.weekStart || getWeekStart(),
      weight: parseNullable(measureValues.weight),
      bodyFat: parseNullable(measureValues.bodyFat),
      chest: parseNullable(measureValues.chest),
      shoulders: parseNullable(measureValues.shoulders),
      rightArm: parseNullable(measureValues.rightArm),
      leftArm: parseNullable(measureValues.leftArm),
      waist: parseNullable(measureValues.waist),
      hips: parseNullable(measureValues.hips),
      rightThigh: parseNullable(measureValues.rightThigh),
      leftThigh: parseNullable(measureValues.leftThigh),
      rightCalf: parseNullable(measureValues.rightCalf),
      leftCalf: parseNullable(measureValues.leftCalf)
    };
    await run(async () => {
      await saveMeasurement(measure);
      setModal(null);
    }, editMeasurement ? "Medición semanal actualizada." : "Medidas guardadas.");
  }

  async function persistPerformance() {
    const weight = Number(performanceWeight), reps = Number(performanceReps);
    if (!performanceExercise.trim() || weight <= 0 || reps < 1) {
      notify("Escribe un ejercicio, peso y repeticiones válidos.");
      return;
    }
    await run(async () => {
      await createManualPerformance({
        id: makeId(), date: new Date().toISOString(), exerciseName: performanceExercise.trim(),
        weight, reps, type: "manual", source: "manual", sessionId: null
      });
      setModal(null);
      setPerformanceExercise("");
      setPerformanceWeight("");
      setPerformanceReps("");
    }, "Marca registrada.");
  }

  async function exportBackup() {
    const directory = FileSystem.cacheDirectory;
    if (!directory) throw new Error("No se encontró una carpeta local para crear la copia.");
    const filename = `diario-fit-${new Date().toISOString().slice(0, 10)}.json`;
    const uri = `${directory}${filename}`;
    await FileSystem.writeAsStringAsync(uri, await exportDatabaseBackup());
    if (!await Sharing.isAvailableAsync()) throw new Error("Compartir archivos no está disponible en este dispositivo.");
    await Sharing.shareAsync(uri, { mimeType: "application/json", dialogTitle: "Guardar copia de Diario Fit" });
  }

  async function shareTextExport(filename: string, content: string, mimeType: string) {
    const directory = FileSystem.cacheDirectory;
    if (!directory) throw new Error("No se encontró una carpeta local para crear la exportación.");
    if (!await Sharing.isAvailableAsync()) throw new Error("Compartir archivos no está disponible en este dispositivo.");
    const uri = `${directory}${filename}`;
    await FileSystem.writeAsStringAsync(uri, content);
    await Sharing.shareAsync(uri, { mimeType, dialogTitle: "Guardar exportación de Diario Fit" });
  }

  async function exportSessionsCsv() {
    const allSessions = await listRecentSessions(null);
    const rows = [csvRow([
      "Fecha", "Sesión", "N.º de sesión", "Entrenamiento de", "Bloque", "Mesociclo", "Microciclo",
      "Ejercicio", "Grupo muscular", "Equipo", "Serie", "Peso", "Unidad de peso", "Repeticiones",
      "RIR", "Descanso (s)", "Notas del ejercicio", "Energía (1-5)", "Sueño (h)", "Agua (ml)",
      "Suplementos", "Molestias", "Conclusiones"
    ])];
    for (const session of allSessions) {
      const base = [
        session.date, session.name, session.sessionNumber, session.trainingOf, session.block, session.mesocycle, session.microcycle
      ];
      if (session.exercises.length === 0) rows.push(csvRow([...base, "", "", "", "", "", "", "", "", "", "", session.energyRating, session.sleepHours, session.waterMl, session.supplements, session.discomfortNotes, session.conclusions]));
      for (const exercise of session.exercises) {
        const sets = exercise.sets.length ? exercise.sets : [null];
        for (const set of sets) {
          rows.push(csvRow([
            ...base, exercise.name, exercise.muscleGroup, exercise.equipment, set?.setNumber ?? "",
            set?.weight, weightUnit, set?.reps, set?.rir, set?.restSeconds, exercise.notes,
            session.energyRating, session.sleepHours, session.waterMl, session.supplements,
            session.discomfortNotes, session.conclusions
          ]));
        }
      }
    }
    const filename = `diario-fit-sesiones-${localDateString()}.csv`;
    await shareTextExport(filename, `\uFEFF${rows.join("\r\n")}`, "text/csv");
  }

  async function exportMeasurementsCsv() {
    const allMeasurements = await listMeasurements();
    const rows = [csvRow([
      "Fecha", "Semana desde", `Peso corporal (${weightUnit})`, "Grasa corporal (%)", `Pecho (${lengthUnit})`,
      `Hombros (${lengthUnit})`, `Brazo derecho (${lengthUnit})`, `Brazo izquierdo (${lengthUnit})`,
      `Cintura (${lengthUnit})`, `Cadera (${lengthUnit})`, `Muslo derecho (${lengthUnit})`,
      `Muslo izquierdo (${lengthUnit})`, `Pantorrilla derecha (${lengthUnit})`, `Pantorrilla izquierda (${lengthUnit})`
    ])];
    for (const item of allMeasurements) rows.push(csvRow([
      item.date, item.weekStart, item.weight, item.bodyFat, item.chest, item.shoulders, item.rightArm,
      item.leftArm, item.waist, item.hips, item.rightThigh, item.leftThigh, item.rightCalf, item.leftCalf
    ]));
    const filename = `diario-fit-medidas-${localDateString()}.csv`;
    await shareTextExport(filename, `\uFEFF${rows.join("\r\n")}`, "text/csv");
  }

  async function exportPdfReport() {
    const [reportSessions, allMeasurements] = await Promise.all([listRecentSessions(50), listMeasurements()]);
    const sessionRows = reportSessions.map((session) => {
      const exerciseList = session.exercises.map((exercise) => {
        const sets = exercise.sets.filter((set) => set.weight !== null && set.reps !== null)
          .map((set) => `${displayNumber(set.weight)} ${weightUnit} × ${set.reps} reps${set.rir === null ? "" : ` · RIR ${displayNumber(set.rir)}`}`)
          .join("; ");
        return `<li><strong>${escapeHtml(exercise.name)}</strong>${sets ? `: ${escapeHtml(sets)}` : ""}</li>`;
      }).join("");
      return `<tr><td>${escapeHtml(formatDate(session.date))}</td><td>${escapeHtml(session.name)}</td><td>${escapeHtml(sessionDuration(session))}</td><td><ul>${exerciseList}</ul></td><td>${escapeHtml(session.conclusions)}</td></tr>`;
    }).join("");
    const measurementRows = allMeasurements.slice(0, 12).map((item) =>
      `<tr><td>${escapeHtml(formatDate(item.date))}</td><td>${escapeHtml(item.weight === null ? "—" : `${displayNumber(item.weight)} ${weightUnit}`)}</td><td>${escapeHtml(item.bodyFat === null ? "—" : `${displayNumber(item.bodyFat)} %`)}</td><td>${escapeHtml(item.waist === null ? "—" : `${displayNumber(item.waist)} ${lengthUnit}`)}</td><td>${escapeHtml(item.chest === null ? "—" : `${displayNumber(item.chest)} ${lengthUnit}`)}</td></tr>`
    ).join("");
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
      body{font-family:Arial,sans-serif;color:#17211d;padding:24px;font-size:11px}
      h1{color:#173c2a;margin-bottom:4px}h2{color:#20734b;margin-top:24px}
      p{color:#626e65}table{width:100%;border-collapse:collapse;margin-top:12px}
      th,td{border:1px solid #dfe7df;padding:7px;vertical-align:top;text-align:left}
      th{background:#e6f4eb;color:#173c2a}ul{margin:0;padding-left:16px}li{margin:0 0 4px}
      .small{font-size:9px;color:#626e65}
    </style></head><body>
      <h1>Diario Fit</h1><p>Informe generado el ${escapeHtml(formatDate(localDateString()))}${profileName ? ` · ${escapeHtml(profileName)}` : ""}</p>
      <p class="small">Sesiones completadas más recientes (máximo 50) y medidas semanales más recientes (máximo 12).</p>
      <h2>Sesiones</h2><table><thead><tr><th>Fecha</th><th>Sesión</th><th>Duración</th><th>Ejercicios y series</th><th>Conclusiones</th></tr></thead><tbody>${sessionRows || "<tr><td colspan='5'>Aún no hay sesiones completadas.</td></tr>"}</tbody></table>
      <h2>Medidas corporales</h2><table><thead><tr><th>Fecha</th><th>Peso</th><th>Grasa</th><th>Cintura</th><th>Pecho</th></tr></thead><tbody>${measurementRows || "<tr><td colspan='5'>Aún no hay medidas registradas.</td></tr>"}</tbody></table>
    </body></html>`;
    const file = await Print.printToFileAsync({ html });
    if (!await Sharing.isAvailableAsync()) throw new Error("Compartir archivos no está disponible en este dispositivo.");
    await Sharing.shareAsync(file.uri, { mimeType: "application/pdf", dialogTitle: "Guardar informe de Diario Fit" });
  }

  async function chooseBackup() {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ["application/json", "text/json", "text/plain"],
      copyToCacheDirectory: true,
      multiple: false
    });
    if (picked.canceled) return;
    const file = picked.assets[0];
    if (!file) throw new Error("No se pudo leer el archivo seleccionado.");
    const content = await FileSystem.readAsStringAsync(file.uri);
    Alert.alert("Reemplazar datos locales", "La restauración reemplazará rutinas, sesiones, medidas y marcas actuales. Exporta una copia antes si quieres conservarlos.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Restaurar copia",
        style: "destructive",
        onPress: () => void run(async () => {
          await importDatabaseBackup(content);
          const restoredSettings = await getSettings();
          const restoredReminder = JSON.parse(restoredSettings.reminder || '{"enabled":false}');
          try {
            await synchronizeTrainingReminders(restoredReminder);
          } catch (caught) {
            Alert.alert("Copia restaurada", caught instanceof Error
              ? `Los datos se restauraron, pero no se pudieron actualizar los recordatorios: ${caught.message}`
              : "Los datos se restauraron, pero no se pudieron actualizar los recordatorios.");
          }
          setScreen("Inicio");
        }, "Copia restaurada.")
      }
    ]);
  }

  async function addSet(exercise: WorkoutSession["exercises"][number]) {
    await run(() => addWorkoutSet(exercise.id, exercise.restSeconds), "Serie añadida.");
  }

  async function addFreeExercise() {
    if (!active || !exerciseName.trim()) return;
    const selectedLibrary = exerciseLibrary.find((item) => item.id === libraryExerciseId);
    const exercise: ExerciseTemplate = {
      id: makeId(), name: exerciseName.trim(),
      libraryExerciseId: selectedLibrary?.name === exerciseName.trim() ? libraryExerciseId : null,
      targetSets: Number(targetSets) || 3,
      minReps: Number(minReps) || 8, maxReps: Number(maxReps) || 12,
      targetRir: Number(targetRir) || 2, restSeconds: Number(restSeconds) || 90
    };
    await run(async () => {
      await addSessionExercise(active.id, exercise);
      setFocusedExerciseIndex(active.exercises.length);
      setModal(null);
      setExerciseName("");
    }, "Ejercicio añadido a la sesión.");
  }

  function renderHeader(title: string, subtitle: string) {
    return (
      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.eyebrow}>DIARIO FIT · LOCAL</Text>
          <Text style={styles.pageTitle}>{title}</Text>
          <Text style={styles.pageSubtitle}>{subtitle}</Text>
        </View>
        <Pressable onPress={() => setScreen("Ajustes")} style={styles.settingsButton}>
          <Text style={styles.settingsButtonText}>⚙</Text>
        </Pressable>
      </View>
    );
  }

  function renderHome() {
    const currentWeek = weekSessions.length;
    const volume = weekSessions.reduce((total, session) => total +
      session.exercises.reduce((subtotal, exercise) => subtotal + exercise.sets.reduce((sum, set) =>
        sum + (set.weight || 0) * (set.reps || 0), 0), 0), 0);
    const assignedTrainingDays = [...new Set(routines.flatMap((routine) => routine.days))].length;
    const weeklyGoal = profileTrainingDays.length || assignedTrainingDays;
    const weightReadings = measurements.filter((entry) => entry.weight !== null).slice(0, 6).reverse();
    const weightValues = weightReadings.map((entry) => Number(entry.weight));
    const minWeight = weightValues.length ? Math.min(...weightValues) : 0;
    const maxWeight = weightValues.length ? Math.max(...weightValues) : 0;
    const weightChange = weightValues.length > 1 ? weightValues[weightValues.length - 1] - weightValues[0] : null;
    const latestRecord = records[0];
    return (
      <>
        {renderHeader(`Hola, ${profileName || "Ariel"}.`, "Este es tu resumen. ¿Listo para entrenar?")}
        {active ? (
          <Pressable style={styles.activeBanner} onPress={() => setScreen("Entrenar")}>
            <Text style={styles.activeBannerTitle}>Sesión en curso · {active.name}</Text>
            <Text style={styles.activeBannerSub}>Toca para continuar registrando tus series →</Text>
          </Pressable>
        ) : null}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>SESIONES ESTA SEMANA</Text>
            <Text style={styles.statValue}>{currentWeek}<Text style={styles.statTarget}>{weeklyGoal ? ` / ${weeklyGoal}` : ""}</Text></Text>
            <View style={styles.goalTrack}><View style={[styles.goalFill, { width: `${weeklyGoal ? Math.min(100, currentWeek / weeklyGoal * 100) : 0}%` }]} /></View>
            <Text style={styles.statFoot}>{weeklyGoal ? "de tu objetivo semanal" : "sin objetivo definido"}</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>VOLUMEN SEMANAL</Text>
            <Text style={styles.statValue}>{displayNumber(volume, 0)}</Text>
            <Text style={styles.statFoot}>{weightUnit} × reps</Text>
          </Card>
        </View>
        <Card style={styles.todayCard}>
          <Text style={[styles.cardKicker, styles.todayCardKicker]}>HOY · {weekdayName(new Date().getDay()).toLocaleUpperCase("es")}</Text>
          <Text style={[styles.cardTitle, styles.todayCardTitle]}>{todayRoutine?.name || "Día libre"}</Text>
          <Text style={[styles.bodyText, styles.todayCardBody]}>{todayRoutine
            ? `${todayRoutine.exercises.length} ejercicios. La app recordará tu última sesión.`
            : "No hay rutina asignada. Puedes iniciar una sesión libre."}</Text>
          <Button title={active ? "Continuar sesión" : todayRoutine ? "Iniciar entrenamiento →" : "Sesión libre →"}
            onPress={() => active ? setScreen("Entrenar") : void startWorkout(todayRoutine)} />
        </Card>
        <SectionTitle title="Plan semanal" action="Editar" onAction={() => setScreen("Rutinas")} />
        <Card>
          {WEEKDAYS.map((day) => {
            const routine = routines.find((item) => item.days.includes(day.index));
            return <View key={day.index} style={styles.scheduleRow}>
              <Text style={styles.scheduleDay}>{day.short}</Text>
              <Text style={routine ? styles.scheduleRoutine : styles.scheduleRest}>{routine?.name || "Descanso"}</Text>
              <Text style={routine ? styles.scheduleMark : styles.scheduleDash}>{routine ? "●" : "—"}</Text>
            </View>;
          })}
          {routines.length === 0 ? <Button title="Crear mi rutina" variant="secondary" onPress={() => openRoutine()} /> : null}
        </Card>
        <SectionTitle title="Medidas recientes" action="Ver todas" onAction={() => setScreen("Progreso")} />
        <Card>
          {lastMeasure ? (
            <View style={styles.metricInline}>
              <View><Text style={styles.statLabel}>Peso corporal</Text><Text style={styles.cardTitle}>{displayNumber(lastMeasure.weight)} {weightUnit}</Text></View>
              <View><Text style={styles.statLabel}>Grasa corporal</Text><Text style={styles.cardTitle}>{displayNumber(lastMeasure.bodyFat)}%</Text></View>
              <Text style={styles.metaText}>{formatDate(lastMeasure.date)}</Text>
            </View>
          ) : <Text style={styles.bodyText}>Aún no registras medidas corporales.</Text>}
        </Card>
        <SectionTitle title="Evolución del peso" action="Ver progreso" onAction={() => setScreen("Progreso")} />
        <Card>
          {weightReadings.length ? (
            <>
              <View style={styles.chartHeader}>
                <View>
                  <Text style={styles.statLabel}>ÚLTIMO REGISTRO</Text>
                  <Text style={styles.chartMainValue}>{displayNumber(weightValues[weightValues.length - 1])} <Text style={styles.metricUnit}>{weightUnit}</Text></Text>
                </View>
                {weightChange !== null ? <Text style={[styles.chartChange, weightChange < 0 && styles.chartChangeDown]}>
                  {weightChange > 0 ? "+" : ""}{displayNumber(weightChange)} {weightUnit}
                </Text> : null}
              </View>
              <View style={styles.weightChart}>
                {weightReadings.map((entry, index) => {
                  const value = Number(entry.weight);
                  const height = maxWeight === minWeight ? 34 : 18 + ((value - minWeight) / (maxWeight - minWeight)) * 36;
                  return <View key={entry.id} style={styles.weightChartColumn}>
                    <Text style={styles.weightChartValue}>{displayNumber(value, 0)}</Text>
                    <View style={styles.weightChartTrack}>
                      <View style={[styles.weightChartBar, { height }, index === weightReadings.length - 1 && styles.weightChartBarCurrent]} />
                    </View>
                    <Text style={styles.weightChartDate}>{formatDate(entry.date, { day: "numeric", month: "short" })}</Text>
                  </View>;
                })}
              </View>
              <Text style={styles.chartCaption}>{weightReadings.length === 1 ? "Añade mediciones semanales para ver tu tendencia." : "Comparación de tus últimas mediciones semanales."}</Text>
            </>
          ) : <Text style={styles.bodyText}>Registra tu peso para empezar a ver su evolución.</Text>}
        </Card>
        <SectionTitle title="Último récord" action="Ver marcas" onAction={() => setScreen("Progreso")} />
        {latestRecord ? (
          <Card style={styles.recordHighlight}>
            <View style={styles.prBadge}><Text style={styles.prBadgeText}>PR</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.statLabel}>{latestRecord.source === "auto" ? "RÉCORD DETECTADO" : "REGISTRO MANUAL"}</Text>
              <Text style={styles.cardTitle}>{latestRecord.exerciseName}</Text>
              <Text style={styles.prValue}>{displayNumber(latestRecord.weight)} {weightUnit} × {latestRecord.reps} reps</Text>
              <Text style={styles.metaText}>{formatDate(latestRecord.date)}</Text>
            </View>
          </Card>
        ) : <EmptyState title="Tu próximo récord empieza aquí" text="Al registrar una nueva marca, aparecerá en este resumen." />}
        <SectionTitle title="Sesiones recientes" action="Historial" onAction={() => setScreen("Sesiones")} />
        {weekSessions.slice(0, 3).map((session) => <SessionCard key={session.id} session={session} onOpen={() => setScreen("Sesiones")} />)}
      </>
    );
  }

  function renderRoutines() {
    return (
      <>
        {renderHeader("Rutinas", "Asigna ejercicios a tus días y olvídate de volver a escribirlos.")}
        <SectionTitle title="Mis plantillas" action="Biblioteca de ejercicios" onAction={() => openExerciseLibrary()} />
        <Button title="+ Nueva rutina" onPress={() => openRoutine()} />
        {routines.length === 0 ? <EmptyState title="Aún no tienes rutinas" text="Crea una plantilla y asígnala a tus días de entrenamiento." /> : null}
        {routines.map((routine) => (
          <Card key={routine.id} style={styles.routineCard}>
            <View style={styles.cardTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{routine.name}</Text>
                <Text style={styles.bodyText}>{routine.days.length ? routine.days.map(weekdayName).join(" · ") : "Sin días asignados"}</Text>
              </View>
              <Pressable onPress={() => openRoutine(routine)}><Text style={styles.actionText}>Editar</Text></Pressable>
            </View>
            {routine.exercises.length ? (
              <NestableDraggableFlatList
                data={routine.exercises}
                keyExtractor={(exercise) => exercise.id}
                scrollEnabled={false}
                activationDistance={5}
                onDragEnd={({ data }) => void run(async () => {
                  await saveRoutine({ ...routine, exercises: data });
                }, "Orden de ejercicios guardado.")}
                renderItem={({ item: exercise, drag, isActive }) => {
                  const groupId = exercise.groupId;
                  return (
                  <View style={[styles.exerciseSummary, isActive && styles.draggingExercise]}>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Mantén para reordenar ${exercise.name}`}
                      onLongPress={drag} delayLongPress={180} style={styles.dragHandle}>
                      <Text style={styles.dragHandleText}>≡</Text>
                    </Pressable>
                    <Pressable style={styles.exerciseSummaryMain} onPress={() => openExercise(routine.id, exercise)}>
                      <Text style={styles.exerciseName}>{exercise.name}</Text>
                      <Text style={styles.metaText}>{exercise.targetSets} × {exercise.minReps}–{exercise.maxReps} · RIR {exercise.targetRir} · {exercise.restSeconds}s</Text>
                      {exercise.groupType ? <Text style={styles.groupBadgeText}>
                          {exerciseGroupLabel(routine.exercises, exercise)?.toLocaleUpperCase("es")}
                      </Text> : null}
                    </Pressable>
                    {groupId ? <Pressable accessibilityRole="button" accessibilityLabel="Quitar ejercicio del grupo"
                      onPress={() => void clearExerciseGrouping(routine, groupId)} style={styles.groupRemoveButton}>
                      <Text style={styles.groupRemoveText}>×</Text>
                    </Pressable> : null}
                    <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${exercise.name}`}
                      onPress={() => openExercise(routine.id, exercise)}><Text style={styles.chevron}>›</Text></Pressable>
                  </View>
                  );
                }}
              />
            ) : <Text style={styles.emptyRoutineText}>Añade ejercicios y mantenlos presionados para cambiar su orden.</Text>}
            <View style={styles.buttonRow}>
              <Button title="+ Ejercicio" variant="secondary" small onPress={() => openExerciseLibrary(routine.id)} />
              <Button title="Superset / circuito" variant="secondary" small onPress={() => openExerciseGrouping(routine)} disabled={routine.exercises.length < 2} />
              <Button title="Iniciar" small onPress={() => void startWorkout(routine)} />
              <Button title="Duplicar" variant="secondary" small onPress={() => void duplicateRoutine(routine)} />
              <Button title="Borrar" variant="danger" small onPress={() => Alert.alert("Borrar rutina", "El historial de sesiones se conservará.", [
                { text: "Cancelar", style: "cancel" },
                { text: "Borrar", style: "destructive", onPress: () => void run(() => deleteRoutine(routine.id), "Rutina eliminada.") }
              ])} />
            </View>
          </Card>
        ))}
      </>
    );
  }

  function renderWorkout() {
    if (!active) {
      return (
        <>
          {renderHeader("Entrenar", "La rutina de hoy se precarga con tu historial.")}
          <Card style={styles.todayCard}>
            <Text style={[styles.cardKicker, styles.todayCardKicker]}>{weekdayName(new Date().getDay()).toLocaleUpperCase("es")}</Text>
            <Text style={[styles.cardTitle, styles.todayCardTitle]}>{todayRoutine?.name || "No hay rutina para hoy"}</Text>
            <Text style={[styles.bodyText, styles.todayCardBody]}>{todayRoutine ? `${todayRoutine.exercises.length} ejercicios listos para empezar.` : "Puedes comenzar una sesión libre o configurar tu plan semanal."}</Text>
            <Button title={todayRoutine ? "Iniciar rutina de hoy →" : "Sesión libre →"} onPress={() => void startWorkout(todayRoutine)} />
          </Card>
          {routines.length === 0 ? <Button title="Crear rutina" variant="secondary" onPress={() => { setScreen("Rutinas"); openRoutine(); }} /> : null}
        </>
      );
    }
    const focusedIndex = Math.min(focusedExerciseIndex, Math.max(0, active.exercises.length - 1));
    const exerciseCount = active.exercises.length;
    const contextSummary = [
      energyRating === null ? null : `Energía ${energyRating}/5`,
      sleepHoursInput.trim() ? `${sleepHoursInput} h de sueño` : null,
      waterMlInput.trim() ? `${waterMlInput} ml de agua` : null,
      supplementsInput.trim() ? "Suplementos anotados" : null
    ].filter(Boolean).join(" · ") || "Añade sueño, agua, suplementos y cómo te sientes.";
    return (
      <>
        {renderHeader(active.name, `Sesión n.º ${active.sessionNumber} · ${formatDate(active.date)}`)}
        <View style={styles.workoutTop}>
          <Text style={styles.workoutTopTitle}>Bloque {active.block} · Meso {active.mesocycle} · Micro {active.microcycle}</Text>
          <Text style={styles.workoutTopSub}>{active.trainingOf || "Entrenamiento"} · Día {active.dayNumber}</Text>
        </View>
        <Card style={styles.contextCard}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: sessionContextExpanded }}
            onPress={() => setSessionContextExpanded((expanded) => !expanded)} style={styles.contextToggle}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Contexto de la sesión</Text>
              <Text style={styles.metaText}>{contextSummary}</Text>
              <Text style={styles.contextDuration}>Duración · {formatDuration(active.startedAt, active.endedAt)}</Text>
            </View>
            <Text style={styles.chevron}>{sessionContextExpanded ? "⌃" : "⌄"}</Text>
          </Pressable>
          {sessionContextExpanded ? <>
            <Text style={[styles.fieldLabel, styles.contextFieldLabel]}>Energía al entrenar · opcional</Text>
            <View style={styles.energyOptions}>
              {ENERGY_LEVELS.map((label, index) => {
                const rating = index + 1;
                const selected = energyRating === rating;
                return <Pressable key={rating} accessibilityRole="radio" accessibilityState={{ selected }}
                  accessibilityLabel={`${rating} de 5, ${label}`} onPress={() => setEnergyRating(rating)}
                  style={[styles.energyOption, selected && styles.energyOptionSelected]}>
                  <Text style={[styles.energyNumber, selected && styles.energySelectedText]}>{rating}</Text>
                  <Text style={[styles.energyLabel, selected && styles.energySelectedText]}>{label}</Text>
                </Pressable>;
              })}
            </View>
            <View style={styles.formRow}>
              <Field label="Sueño previo" value={sleepHoursInput} onChangeText={setSleepHoursInput}
                keyboardType="decimal-pad" placeholder="7,5" suffix="h" />
              <Field label="Agua tomada" value={waterMlInput} onChangeText={setWaterMlInput}
                keyboardType="numeric" placeholder="750" suffix="ml" />
            </View>
            <Field label="Molestias o dolor · opcional" value={discomfortInput} onChangeText={setDiscomfortInput}
              placeholder="Zona, intensidad o notas" multiline />
            <Field label="Suplementos · nombre y dosis" value={supplementsInput} onChangeText={setSupplementsInput}
              placeholder="Creatina 5 g, proteína 25 g…" multiline />
            <Text style={styles.contextSaveHint}>El contexto se guarda automáticamente en este dispositivo.</Text>
            {sessionContextError ? <Text style={styles.errorText}>{sessionContextError}</Text> : null}
          </> : null}
        </Card>
        {exerciseCount > 0 ? (
          <>
            <View style={styles.focusHeader}>
              <View>
                <Text style={styles.focusEyebrow}>EJERCICIO {focusedIndex + 1} DE {exerciseCount}</Text>
                <Text style={styles.focusProgressText}>Avanza a tu ritmo</Text>
              </View>
              <View style={styles.focusNav}>
                <Pressable accessibilityRole="button" accessibilityLabel="Ejercicio anterior" disabled={focusedIndex === 0}
                  onPress={() => setFocusedExerciseIndex((index) => Math.max(0, index - 1))}
                  style={[styles.focusNavButton, focusedIndex === 0 && styles.focusNavDisabled]}>
                  <Text style={styles.focusNavText}>‹</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="Siguiente ejercicio" disabled={focusedIndex >= exerciseCount - 1}
                  onPress={() => setFocusedExerciseIndex((index) => Math.min(exerciseCount - 1, index + 1))}
                  style={[styles.focusNavButton, focusedIndex >= exerciseCount - 1 && styles.focusNavDisabled]}>
                  <Text style={styles.focusNavText}>›</Text>
                </Pressable>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.exerciseDots}>
              {active.exercises.map((exercise, index) => (
                <Pressable key={exercise.id} accessibilityRole="button" accessibilityLabel={`Ir a ${exercise.name}`}
                  onPress={() => setFocusedExerciseIndex(index)} style={[styles.exerciseDot, index === focusedIndex && styles.exerciseDotSelected]}>
                  <Text style={[styles.exerciseDotText, index === focusedIndex && styles.exerciseDotTextSelected]}>{index + 1}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : <EmptyState title="Sesión libre" text="Añade un ejercicio para comenzar a registrar." />}
        {active.exercises.map((exercise, exerciseIndex) => {
          if (exerciseIndex !== focusedIndex) return null;
          const previousExercise = sessions.flatMap((session) => session.exercises)
            .find((item) => (exercise.libraryExerciseId && item.libraryExerciseId === exercise.libraryExerciseId) ||
              item.name.trim().toLocaleLowerCase("es") === exercise.name.trim().toLocaleLowerCase("es"));
          const previousSets = previousExercise?.sets.filter((set) => set.weight !== null && set.reps !== null) || [];
          const previousDate = sessions.find((session) => session.exercises.some((item) =>
            (exercise.libraryExerciseId && item.libraryExerciseId === exercise.libraryExerciseId) ||
            item.name.trim().toLocaleLowerCase("es") === exercise.name.trim().toLocaleLowerCase("es")))?.date;
          const previousTargetSets = previousSets.slice(0, exercise.targetSets);
          const previousBest = bestSet(previousSets);
          const enoughSets = previousTargetSets.length >= exercise.targetSets;
          const allRirRecorded = enoughSets && previousTargetSets.every((set) => set.rir !== null);
          const allAtTopOfRange = enoughSets && previousTargetSets.every((set) => set.reps !== null &&
            set.reps >= exercise.maxReps && set.rir !== null && set.rir >= exercise.targetRir);
          const belowRirTarget = previousTargetSets.some((set) => set.rir !== null && set.rir < exercise.targetRir);
          const suggestedWeight = (previousBest?.weight || 0) + (weightUnit === "kg" ? 2.5 : 5);
          const suggestion = previousSets.length === 0
            ? "Sin historial previo. Registra una carga inicial; la app no cambiará el peso automáticamente."
            : allAtTopOfRange
              ? `Propuesta: ${displayNumber(suggestedWeight)} ${weightUnit}. Motivo: completaste ${exercise.targetSets}/${exercise.targetSets} series en ${exercise.maxReps} reps o más y con RIR igual o superior a ${exercise.targetRir}.`
              : !enoughSets
                ? `Propuesta: mantén ${displayNumber(previousBest?.weight)} ${weightUnit}. Motivo: solo hay ${previousTargetSets.length}/${exercise.targetSets} series completas para comparar.`
                : belowRirTarget
                  ? `Propuesta: mantén ${displayNumber(previousBest?.weight)} ${weightUnit} y prioriza técnica y recuperación. Motivo: alguna serie quedó por debajo del RIR objetivo (${exercise.targetRir}).`
                  : !allRirRecorded
                    ? `Propuesta: mantén ${displayNumber(previousBest?.weight)} ${weightUnit}. Motivo: falta registrar el RIR de alguna serie; completa ese dato para valorar una subida.`
                    : `Propuesta: mantén ${displayNumber(previousBest?.weight)} ${weightUnit} e intenta acercarte a ${exercise.maxReps} reps por serie manteniendo el RIR objetivo (${exercise.targetRir}).`;
          return (
          <Card key={exercise.id} style={styles.exerciseCard}>
            <View style={styles.cardTopRow}><View style={{ flex: 1 }}>
              <Text style={styles.exerciseFocusTitle}>{exercise.name}</Text>
              <Text style={styles.metaText}>{exercise.targetSets} series · {exercise.minReps}–{exercise.maxReps} reps · RIR {exercise.targetRir}</Text>
              <Text style={styles.metaText}>{exercise.muscleGroup || "Sin clasificar"} · {exercise.equipment || "Equipo no especificado"}</Text>
              {exercise.instructions ? <Text style={styles.libraryDescription}>{exercise.instructions}</Text> : null}
              {exercise.groupType ? <Text style={styles.groupBadgeText}>
                {exerciseGroupLabel(active.exercises, exercise)?.toLocaleUpperCase("es")} · {exercise.groupType === "superset" ? "alternar" : "rondas"}
              </Text> : null}
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </View><Pressable onPress={() => Alert.alert("Quitar ejercicio", "Las sesiones históricas no cambiarán.", [
              { text: "Cancelar", style: "cancel" },
              { text: "Quitar", style: "destructive", onPress: () => void run(() => deleteSessionExercise(exercise.id)) }
            ])}><Text style={styles.removeSetText}>×</Text></Pressable></View>
            <View style={styles.previousSession}>
              <Text style={styles.previousSessionTitle}>{previousExercise ? `ÚLTIMA VEZ${previousDate ? ` · ${formatDate(previousDate)}` : ""}` : "PRIMER REGISTRO"}</Text>
              {previousSets.length
                ? <Text style={styles.previousSessionValues}>{previousSets.map((set, index) =>
                  `${index + 1}: ${displayNumber(set.weight)} ${weightUnit} × ${set.reps} · RIR ${displayNumber(set.rir)}`).join("   ")}</Text>
                : <Text style={styles.metaText}>Las series de referencia aparecerán aquí.</Text>}
            </View>
            {exercise.sets.map((set, setIndex) => (
              <SetLine key={set.id} set={set} previousSet={setIndex > 0 ? exercise.sets[setIndex - 1] : undefined}
                onCopy={setIndex > 0 ? () => void copyPreviousSet(set, exercise.sets[setIndex - 1]) : undefined}
                weightUnit={weightUnit} onSave={saveSet}
                onComplete={(updated) => void completeSet(updated)}
                onDelete={() => void removeSetWithUndo(set, exercise.id)} />
            ))}
            <Button title="+ Añadir serie" variant="secondary" onPress={() => void addSet(exercise)} />
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Notas del ejercicio</Text>
              <TextInput defaultValue={exercise.notes} placeholder="Técnica, sensaciones..." placeholderTextColor={COLORS.placeholder}
                onEndEditing={(event) => void updateSessionNotes(active.id, exercise.id, event.nativeEvent.text).catch((caught: unknown) =>
                  Alert.alert("Error al guardar", caught instanceof Error ? caught.message : "No se pudieron guardar las notas."))}
                multiline style={[styles.input, styles.textArea]} />
            </View>
          </Card>
          );
        })}
        <Button title="+ Añadir ejercicio extra" variant="secondary" onPress={() => {
          setExerciseName(""); setLibraryExerciseId(null); setTargetSets("3"); setMinReps("8"); setMaxReps("12"); setTargetRir("2"); setRestSeconds("90");
          openExerciseLibrary(null, true);
        }} />
        <Field label="Conclusiones de la sesión" value={conclusion || active.conclusions} onChangeText={setConclusion}
          onBlur={() => void updateSessionNotes(active.id, "", conclusion || active.conclusions)}
          placeholder="Sensaciones y próximo paso..." multiline />
        <Button title="Finalizar sesión ✓" onPress={() => void completeWorkout()} />
      </>
    );
  }

  function renderSessions() {
    const days = weekSessions;
    return (
      <>
        {renderHeader("Sesiones", "Esta semana primero; el historial completo está debajo.")}
        <Card>
          <Text style={styles.cardKicker}>ESTA SEMANA · DESDE EL LUNES</Text>
          <Text style={styles.cardTitle}>{days.length} sesiones</Text>
          {days.length === 0 ? <Text style={styles.bodyText}>Todavía no hay sesiones esta semana.</Text> : days.map((session) =>
            <SessionCard key={session.id} session={session} onOpen={() => showSessionAlert(session)} onDelete={() => Alert.alert("Borrar sesión", "Esta acción no se puede deshacer.", [
              { text: "Cancelar", style: "cancel" },
              { text: "Borrar", style: "destructive", onPress: () => void run(() => deleteSession(session.id), "Sesión eliminada.") }
            ])} />)}
        </Card>
        <SectionTitle title="Historial reciente" />
        {sessions.filter((session) => !days.some((current) => current.id === session.id)).map((session) =>
          <SessionCard key={session.id} session={session} onOpen={() => showSessionAlert(session)} onDelete={() => Alert.alert("Borrar sesión", "Esta acción no se puede deshacer.", [
            { text: "Cancelar", style: "cancel" },
            { text: "Borrar", style: "destructive", onPress: () => void run(() => deleteSession(session.id), "Sesión eliminada.") }
          ])} />)}
      </>
    );
  }

  function showSessionAlert(session: WorkoutSession) {
    const details = session.exercises.map((exercise) => {
      const sets = exercise.sets.filter((set) => set.weight !== null && set.reps !== null)
        .map((set) => `${displayNumber(set.weight)} ${weightUnit} × ${set.reps} · RIR ${displayNumber(set.rir)}`).join("\n");
      return `${exercise.name}\n${sets || "Sin series registradas"}${exercise.notes ? `\nNotas: ${exercise.notes}` : ""}`;
    }).join("\n\n");
    const context = [
      `Duración: ${sessionDuration(session)}`,
      session.energyRating === null ? null : `Energía: ${session.energyRating}/5`,
      session.sleepHours === null ? null : `Sueño: ${displayNumber(session.sleepHours)} h`,
      session.waterMl === null ? null : `Agua tomada: ${session.waterMl} ml`,
      session.discomfortNotes ? `Molestias: ${session.discomfortNotes}` : null,
      session.supplements ? `Suplementos: ${session.supplements}` : null
    ].filter(Boolean).join("\n");
    Alert.alert(`${session.name} · #${session.sessionNumber}`,
      `${context ? `${context}\n\n` : ""}${details}${session.conclusions ? `\n\nConclusiones: ${session.conclusions}` : ""}`);
  }

  function renderProgress() {
    const previousMeasure = measurements[1];
    const currentWeekStart = getWeekStart();
    const analysisWeeks = Array.from({ length: 8 }, (_, index) => {
      const date = new Date(`${currentWeekStart}T12:00:00`);
      date.setDate(date.getDate() - 7 * index);
      return localDateString(date);
    });
    const recentWeightMeasures = measurements.filter((item) => item.weight !== null).slice(0, 3);
    const previousWeightMeasures = measurements.filter((item) => item.weight !== null).slice(3, 6);
    const meanWeight = (entries: Measurement[]) => entries.length
      ? entries.reduce((sum, item) => sum + Number(item.weight), 0) / entries.length : null;
    const recentWeightMean = meanWeight(recentWeightMeasures);
    const previousWeightMean = meanWeight(previousWeightMeasures);
    const weightTrend = recentWeightMean !== null && previousWeightMean !== null
      ? recentWeightMean - previousWeightMean : null;
    const thisWeekMuscleVolume = weeklyMuscleVolume.filter((item) => item.weekStart === currentWeekStart);
    const metricOptions: Array<{ key: ProgressMetric; label: string; unit: string }> = [
      { key: "weight", label: "Peso", unit: weightUnit },
      { key: "reps", label: "Repeticiones", unit: "reps" },
      { key: "volume", label: "Volumen", unit: `${weightUnit}·reps` }
    ];
    const metric = metricOptions.find((item) => item.key === progressMetric) || metricOptions[0];
    const progressValue = (point: ExerciseProgressPoint): number | null => progressMetric === "weight"
      ? point.bestWeight : progressMetric === "reps" ? point.bestReps : point.volume;
    const chartPoints = exerciseProgress.map((point) => ({ point, value: progressValue(point) }))
      .filter((item): item is { point: ExerciseProgressPoint; value: number } =>
        item.value !== null && Number.isFinite(item.value));
    const values = chartPoints.map((item) => item.value);
    const minValue = values.length ? Math.min(...values) : 0;
    const maxValue = values.length ? Math.max(...values) : 0;
    const latestPoint = chartPoints.at(-1);
    const previousPoint = chartPoints.at(-2);
    const change = latestPoint && previousPoint ? latestPoint.value - previousPoint.value : null;
    return (
      <>
        {renderHeader("Progreso", "Medidas corporales y marcas de rendimiento.")}
        <SectionTitle title="Medidas semanales" action="+ Registrar" onAction={() => openMeasurement()} />
        {measurements.map((entry, index) => (
          <Pressable key={entry.id} onPress={() => openMeasurement(entry)}>
            <Card style={styles.measureCard}>
              <View style={styles.cardTopRow}><View><Text style={styles.cardTitle}>{formatDate(entry.date)}</Text>
                <Text style={styles.metaText}>Semana del {entry.weekStart}</Text></View><Text style={styles.actionText}>Editar</Text></View>
              <View style={styles.metricGrid}>
                {MEASURE_FIELDS.filter(({ key }) => entry[key] !== null).slice(0, 6).map(({ key, label, unit }) => {
                  const nowValue = Number(entry[key]);
                  const oldValue = previousMeasure?.[key];
                  const delta = oldValue === null || oldValue === undefined ? null : nowValue - Number(oldValue);
                  return <View key={String(key)} style={styles.metricCell}>
                    <Text style={styles.statLabel}>{label}</Text>
                    <Text style={styles.metricValue}>{displayNumber(nowValue)} <Text style={styles.metricUnit}>{unit}</Text></Text>
                    {index === 0 ? <Text style={styles.statFoot}>{delta === null ? "Sin medición previa" : `Δ ${delta > 0 ? "+" : ""}${displayNumber(delta)} ${unit}`}</Text> : null}
                  </View>;
                })}
              </View>
            </Card>
          </Pressable>
        ))}
        {measurements.length === 0 ? <EmptyState title="Sin mediciones" text="Registra una medición semanal y compara tus cambios." /> : null}
        <SectionTitle title="Progreso por ejercicio" />
        <Card>
          {progressExercises.length ? <>
            <Text style={styles.fieldLabel}>Ejercicio</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.progressChipScroll}>
              {progressExercises.map((name) => {
                const selected = selectedProgressExercise === name;
                return <Pressable key={name} accessibilityRole="button" accessibilityState={{ selected }}
                  onPress={() => setSelectedProgressExercise(name)}
                  style={[styles.progressChip, selected && styles.progressChipSelected]}>
                  <Text style={[styles.progressChipText, selected && styles.progressChipTextSelected]}>{name}</Text>
                </Pressable>;
              })}
            </ScrollView>
            <Text style={styles.fieldLabel}>Periodo</Text>
            <View style={styles.progressChips}>
              {([
                ["week", "Semana"], ["month", "Mes"], ["custom", "Rango"], ["all", "Todo"]
              ] as Array<[ProgressRange, string]>).map(([range, label]) => {
                const selected = progressRange === range;
                return <Pressable key={range} accessibilityRole="button" accessibilityState={{ selected }}
                  onPress={() => setProgressRange(range)}
                  style={[styles.progressChip, selected && styles.progressChipSelected]}>
                  <Text style={[styles.progressChipText, selected && styles.progressChipTextSelected]}>{label}</Text>
                </Pressable>;
              })}
            </View>
            {progressRange === "custom" ? <View style={styles.formRow}>
              <Field label="Desde (AAAA-MM-DD)" value={progressRangeStartInput} onChangeText={setProgressRangeStartInput} placeholder="2025-01-01" />
              <Field label="Hasta (AAAA-MM-DD)" value={progressRangeEndInput} onChangeText={setProgressRangeEndInput} placeholder={localDateString()} />
            </View> : null}
            <Text style={styles.fieldLabel}>Métrica</Text>
            <View style={styles.progressChips}>
              {metricOptions.map((option) => {
                const selected = progressMetric === option.key;
                return <Pressable key={option.key} accessibilityRole="button" accessibilityState={{ selected }}
                  onPress={() => setProgressMetric(option.key)}
                  style={[styles.progressChip, selected && styles.progressChipSelected]}>
                  <Text style={[styles.progressChipText, selected && styles.progressChipTextSelected]}>{option.label}</Text>
                </Pressable>;
              })}
            </View>
            {progressError ? <Text style={styles.errorText}>{progressError}</Text> : null}
            {progressLoading ? <Text style={styles.chartCaption}>Cargando progreso…</Text> : null}
            {!progressLoading && !progressError && latestPoint ? <>
              <View style={styles.progressSummary}>
                <View>
                  <Text style={styles.statLabel}>ÚLTIMA SESIÓN · {formatDate(latestPoint.point.date, { day: "numeric", month: "short" })}</Text>
                  <Text style={styles.chartMainValue}>{displayNumber(latestPoint.value, progressMetric === "reps" ? 0 : 1)} <Text style={styles.metricUnit}>{metric.unit}</Text></Text>
                </View>
                {change !== null ? <Text style={[styles.chartChange, change < 0 && styles.progressChangeDown]}>
                  {change > 0 ? "+" : ""}{displayNumber(change, progressMetric === "reps" ? 0 : 1)} vs. anterior
                </Text> : null}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={[styles.progressChart, { width: Math.max(chartPoints.length * 67, 250) }]}>
                  {chartPoints.map(({ point, value }) => {
                    const height = maxValue === minValue ? 38 : 17 + ((value - minValue) / (maxValue - minValue)) * 55;
                    const isLatest = point.sessionId === latestPoint.point.sessionId;
                    return <View key={point.sessionId} style={styles.progressChartColumn}>
                      <Text style={styles.progressChartValue}>{displayNumber(value, progressMetric === "reps" ? 0 : 1)}</Text>
                      <View style={styles.progressChartTrack}>
                        <View style={[styles.progressChartBar, { height }, isLatest && styles.progressChartBarCurrent]} />
                      </View>
                      <Text style={styles.progressChartDate}>{formatDate(point.date, { day: "numeric", month: "short" })}</Text>
                    </View>;
                  })}
                </View>
              </ScrollView>
              <Text style={styles.chartCaption}>{chartPoints.length} {chartPoints.length === 1 ? "sesión registrada" : "sesiones registradas"} · {metric.label.toLocaleLowerCase("es")} · {metric.unit}</Text>
            </> : null}
            {!progressLoading && !progressError && !chartPoints.length
              ? <Text style={styles.bodyText}>No hay series completas de este ejercicio en el periodo elegido.</Text> : null}
          </> : <Text style={styles.bodyText}>Completa una sesión con series registradas para ver aquí el progreso de cada ejercicio.</Text>}
        </Card>
        <SectionTitle title="Análisis del entrenamiento" />
        <Card>
          <Text style={styles.sectionTitle}>Consistencia del plan</Text>
          {plannedWorkoutCount > 0 ? <>
            <Text style={styles.analyticsMainValue}>
              {weeklySessionCounts.find((item) => item.weekStart === currentWeekStart)?.completedSessions || 0}
              <Text style={styles.metricUnit}> / {plannedWorkoutCount} sesiones esta semana</Text>
            </Text>
            <View style={styles.goalTrack}>
              <View style={[styles.goalFill, { width: `${Math.min(100,
                ((weeklySessionCounts.find((item) => item.weekStart === currentWeekStart)?.completedSessions || 0) /
                  plannedWorkoutCount) * 100)}%` }]} />
            </View>
          </> : <Text style={styles.bodyText}>Asigna días a tus rutinas para comparar tus sesiones con un plan.</Text>}
          {analysisWeeks.map((weekStart) => {
            const count = weeklySessionCounts.find((item) => item.weekStart === weekStart)?.completedSessions || 0;
            return <View key={weekStart} style={styles.analyticsWeekRow}>
              <Text style={styles.metaText}>Semana del {formatDate(weekStart, { day: "numeric", month: "short" })}</Text>
              <Text style={styles.analyticsWeekCount}>{count}{plannedWorkoutCount ? ` / ${plannedWorkoutCount}` : ""}</Text>
            </View>;
          })}
        </Card>
        <Card>
          <Text style={styles.sectionTitle}>Tendencia del peso corporal</Text>
          {recentWeightMean !== null ? <>
            <Text style={styles.analyticsMainValue}>{displayNumber(recentWeightMean)} <Text style={styles.metricUnit}>{weightUnit} · media de {recentWeightMeasures.length} mediciones</Text></Text>
            <Text style={styles.metaText}>{weightTrend === null
              ? "Registra al menos cuatro mediciones semanales para comparar dos tendencias."
              : `Cambio de la media reciente frente a ${previousWeightMeasures.length} medición${previousWeightMeasures.length === 1 ? "" : "es"} anterior${previousWeightMeasures.length === 1 ? "" : "es"}: ${weightTrend > 0 ? "+" : ""}${displayNumber(weightTrend)} ${weightUnit}.`}</Text>
          </> : <Text style={styles.bodyText}>Registra el peso corporal semanal para ver una tendencia suavizada.</Text>}
        </Card>
        <Card>
          <Text style={styles.sectionTitle}>Volumen por grupo muscular · esta semana</Text>
          <Text style={styles.metaText}>Volumen = peso × repeticiones. Cada ejercicio se atribuye a su grupo principal.</Text>
          {thisWeekMuscleVolume.length ? thisWeekMuscleVolume.slice(0, 6).map((item) => (
            <View key={item.muscleGroup} style={styles.analyticsWeekRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.exerciseName}>{item.muscleGroup}</Text>
                <Text style={styles.metaText}>{item.completedSets} series completas</Text>
              </View>
              <Text style={styles.analyticsWeekCount}>{displayNumber(item.volume, 0)} {weightUnit}·reps</Text>
            </View>
          )) : <Text style={styles.bodyText}>Completa una sesión con ejercicios de la biblioteca para ver el volumen semanal.</Text>}
        </Card>
        <Card>
          <Text style={styles.sectionTitle}>Récords personales</Text>
          {personalRecords.length ? personalRecords.slice(0, 8).map((record) => (
            <View key={record.exerciseName} style={styles.analyticsWeekRow}>
              <Text style={[styles.exerciseName, { flex: 1 }]}>{record.exerciseName}</Text>
              <Text style={styles.analyticsWeekCount}>
                {record.bestWeight === null ? "" : `Peso máx. ${displayNumber(record.bestWeight)} ${weightUnit}`}
                {record.bestWeight !== null && record.bestReps !== null ? " · " : ""}
                {record.bestReps === null ? "" : `Reps máx. ${record.bestReps}`}
              </Text>
            </View>
          )) : <Text style={styles.bodyText}>Completa sesiones con series registradas para detectar tus mejores valores.</Text>}
        </Card>
        <SectionTitle title="Marcas registradas" action="+ Registrar" onAction={() => {
          setPerformanceExercise(""); setPerformanceWeight(""); setPerformanceReps(""); setModal("performance");
        }} />
        {records.map((record) => (
          <Card key={record.id} style={styles.recordRow}>
            <View style={{ flex: 1 }}><Text style={styles.exerciseName}>{record.exerciseName}</Text>
              <Text style={styles.metaText}>{formatDate(record.date)} · {record.source === "auto" ? "Detectada" : "Manual"}</Text></View>
            <Text style={styles.recordValue}>{displayNumber(record.weight)} {weightUnit} × {record.reps}</Text>
          </Card>
        ))}
        {records.length === 0 ? <Text style={styles.bodyText}>Las nuevas marcas se detectarán automáticamente al terminar una sesión.</Text> : null}
      </>
    );
  }

  function renderSettings() {
    const selected = JSON.parse(settings.reminder || '{"days":[1,3,5]}');
    return (
      <>
        {renderHeader("Ajustes", "Preferencias y recordatorios locales.")}
        <Card>
          <Text style={styles.sectionTitle}>Tu perfil</Text>
          <Text style={styles.metaText}>Un perfil sencillo para personalizar tu diario.</Text>
          <Field label="Nombre" value={profileName} onChangeText={setProfileName} placeholder="¿Cómo te llamamos?" />
          <Text style={[styles.fieldLabel, styles.daysLabel]}>Días que prefieres entrenar</Text>
          <View style={styles.dayChips}>{WEEKDAYS.map((day) => {
            const isSelected = profileTrainingDays.includes(day.index);
            return <Pressable key={day.index} style={[styles.dayChip, isSelected && styles.dayChipSelected]}
              onPress={() => setProfileTrainingDays((days) => isSelected
                ? days.filter((value) => value !== day.index) : [...days, day.index])}>
              <Text style={[styles.dayChipText, isSelected && styles.dayChipTextSelected]}>{day.short}</Text>
            </Pressable>;
          })}</View>
          <Text style={styles.metaText}>Unidades usadas en tus registros: {weightUnit} y {lengthUnit}.</Text>
          <Button title="Guardar perfil" variant="secondary" onPress={() => void saveProfile()} />
        </Card>
        <Card>
          <Text style={styles.sectionTitle}>Recordatorios locales</Text>
          <View style={styles.settingRow}><View style={{ flex: 1 }}><Text style={styles.exerciseName}>Avisos de entrenamiento</Text><Text style={styles.metaText}>Funcionan sin conexión y pueden llegar con la app cerrada.</Text></View>
            <Switch value={reminderEnabled} onValueChange={(value) => { setReminderEnabled(value); void saveReminders(value); }} trackColor={{ true: COLORS.green }} /></View>
          <Field label="Hora local" value={reminderTime} onChangeText={setReminderTime} placeholder="18:00" />
          <View style={styles.dayChips}>{WEEKDAYS.map((day) => {
            const isSelected = (selected.days || []).includes(day.index);
            return <Pressable key={day.index} style={[styles.dayChip, isSelected && styles.dayChipSelected]}
              onPress={() => {
                const nextDays = isSelected ? selected.days.filter((item: number) => item !== day.index) : [...(selected.days || []), day.index];
                const next = { ...selected, days: nextDays };
                void run(async () => {
                  if (reminderEnabled) await saveReminders(true, reminderTime, nextDays);
                  else await setSetting("reminder", JSON.stringify(next));
                });
              }}>
              <Text style={[styles.dayChipText, isSelected && styles.dayChipTextSelected]}>{day.short}</Text>
            </Pressable>;
          })}</View>
          <Button title="Guardar horario" variant="secondary" onPress={() => void saveReminders(reminderEnabled, reminderTime)} />
        </Card>
        <Card>
          <Text style={styles.sectionTitle}>Cabeceras del diario</Text>
          <Text style={styles.metaText}>Los valores se copian al inicio de cada sesión.</Text>
          <Field label="Entrenamiento de" value={headerDefaults.trainingOf} onChangeText={(value) => setHeaderDefaults((current) => ({ ...current, trainingOf: value }))} />
          <View style={styles.buttonRow}>
            <Field label="Bloque" value={String(headerDefaults.block)} onChangeText={(value) => setHeaderDefaults((current) => ({ ...current, block: Number(value) || 1 }))} keyboardType="numeric" />
            <Field label="Mesociclo" value={String(headerDefaults.mesocycle)} onChangeText={(value) => setHeaderDefaults((current) => ({ ...current, mesocycle: Number(value) || 1 }))} keyboardType="numeric" />
            <Field label="Microciclo" value={String(headerDefaults.microcycle)} onChangeText={(value) => setHeaderDefaults((current) => ({ ...current, microcycle: Number(value) || 1 }))} keyboardType="numeric" />
          </View>
          <Button title="Guardar cabeceras" variant="secondary" onPress={() => void run(async () => {
            await setSetting("header_defaults", JSON.stringify(headerDefaults));
          }, "Cabeceras actualizadas.")} />
        </Card>
        <Card>
          <Text style={styles.sectionTitle}>Privacidad</Text>
          <Text style={styles.bodyText}>La base de datos SQLite está dentro del almacenamiento privado de Android. No hay cuenta ni sincronización en la nube.</Text>
          <Text style={styles.metaText}>Unidades actuales: {weightUnit} y {lengthUnit}.</Text>
        </Card>
        <Card>
          <Text style={styles.sectionTitle}>Copia de seguridad</Text>
          <Text style={styles.bodyText}>El JSON conserva todos tus datos y ajustes para restaurarlos. Los CSV exportan el historial completo y el PDF resume las 50 sesiones y 12 medidas más recientes.</Text>
          <Button title="Exportar copia JSON" variant="secondary" onPress={() => void run(exportBackup)} />
          <Button title="Exportar sesiones CSV" variant="secondary" onPress={() => void run(exportSessionsCsv)} />
          <Button title="Exportar medidas CSV" variant="secondary" onPress={() => void run(exportMeasurementsCsv)} />
          <Button title="Generar informe PDF" variant="secondary" onPress={() => void run(exportPdfReport)} />
          <Button title="Restaurar desde archivo" variant="secondary" onPress={() => void chooseBackup().catch((caught: unknown) =>
            Alert.alert("No se pudo abrir la copia", caught instanceof Error ? caught.message : "Error al seleccionar el archivo."))} />
        </Card>
      </>
    );
  }

  function renderOnboarding() {
    return (
      <ThemeContext.Provider value={COLORS}>
        <GestureHandlerRootView style={styles.app}>
          <StatusBar style={COLORS.statusBar} />
          <ScrollView contentContainerStyle={styles.onboardingScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.welcomeMark}><Text style={styles.welcomeMarkText}>DF</Text></View>
            <Text style={styles.eyebrow}>BIENVENIDO A DIARIO FIT</Text>
            <Text style={styles.welcomeTitle}>Tu entrenamiento,{`\n`}a tu manera.</Text>
            <Text style={styles.welcomeDescription}>Personalicemos tu diario. Lo opcional lo puedes completar después; tus datos se quedan en este dispositivo.</Text>
            <Card style={styles.onboardingCard}>
              <Field label="¿Cómo te llamamos? *" value={onboardingName} onChangeText={setOnboardingName} placeholder="Tu nombre" />
              <Text style={[styles.fieldLabel, styles.daysLabel]}>Unidades</Text>
              <View style={styles.unitSelector}>
                {(["metric", "imperial"] as const).map((system) => {
                  const selected = onboardingSystem === system;
                  return <Pressable key={system} accessibilityRole="button" accessibilityState={{ selected }}
                    onPress={() => setOnboardingSystem(system)} style={[styles.unitOption, selected && styles.unitOptionSelected]}>
                    <Text style={[styles.unitOptionTitle, selected && styles.unitOptionTitleSelected]}>{system === "metric" ? "Métricas" : "Imperiales"}</Text>
                    <Text style={[styles.unitOptionSubtitle, selected && styles.unitOptionTitleSelected]}>{system === "metric" ? "kg · cm" : "lb · in"}</Text>
                  </Pressable>;
                })}
              </View>
              <Field label={`Peso actual · opcional (${onboardingSystem === "imperial" ? "lb" : "kg"})`}
                value={onboardingWeight} onChangeText={setOnboardingWeight} keyboardType="decimal-pad" placeholder="—" />
              <Text style={[styles.fieldLabel, styles.daysLabel]}>¿Qué días sueles entrenar? · opcional</Text>
              <View style={styles.dayChips}>{WEEKDAYS.map((day) => {
                const selected = onboardingDays.includes(day.index);
                return <Pressable key={day.index} accessibilityRole="button" accessibilityState={{ selected }}
                  onPress={() => setOnboardingDays((days) => selected
                    ? days.filter((value) => value !== day.index) : [...days, day.index])}
                  style={[styles.dayChip, selected && styles.dayChipSelected]}>
                  <Text style={[styles.dayChipText, selected && styles.dayChipTextSelected]}>{day.short}</Text>
                </Pressable>;
              })}</View>
              <Text style={styles.helperText}>Podrás completar tus medidas y rutinas más tarde.</Text>
              <Button title={onboardingSaving ? "Guardando…" : "Empezar mi diario →"} disabled={onboardingSaving || !onboardingName.trim()}
                onPress={() => void completeOnboarding()} />
            </Card>
            <Text style={styles.privacyNote}>🔒 Sin cuenta, sin nube. Tu información de entrenamiento permanece en tu teléfono.</Text>
          </ScrollView>
        </GestureHandlerRootView>
      </ThemeContext.Provider>
    );
  }

  function renderModal() {
    const isVisible = modal !== null;
    let title = "", content: React.ReactNode = null, saveLabel = "Guardar", onSave = () => {};
    if (modal === "routine") {
      title = editingRoutineId ? "Editar rutina" : "Nueva rutina";
      onSave = () => void persistRoutine();
      content = <>
        <Field label="Nombre" value={routineName} onChangeText={setRoutineName} placeholder="Ej. Empuje A" />
        <Field label="Notas (opcional)" value={routineNotes} onChangeText={setRoutineNotes} multiline />
        <Text style={styles.fieldLabel}>Días asignados</Text>
        <View style={styles.dayChips}>{WEEKDAYS.map((day) => {
          const checked = selectedDays.includes(day.index);
          return <Pressable key={day.index} onPress={() => setSelectedDays((current) =>
            checked ? current.filter((value) => value !== day.index) : [...current, day.index])}
            style={[styles.dayChip, checked && styles.dayChipSelected]}>
            <Text style={[styles.dayChipText, checked && styles.dayChipTextSelected]}>{day.short}</Text>
          </Pressable>;
        })}</View>
        <Text style={styles.helperText}>Una rutina por día. Si asignas el mismo día, se reasignará a esta plantilla.</Text>
      </>;
    } else if (modal === "exercise" || modal === "freeExercise") {
      title = modal === "freeExercise" ? "Ejercicio extra" : editingExerciseId ? "Editar ejercicio" : "Añadir ejercicio";
      onSave = () => void (modal === "freeExercise" ? addFreeExercise() : persistExercise());
      content = <>
        <Field label="Nombre del ejercicio" value={exerciseName} onChangeText={changeExerciseName} placeholder="Ej. Press banca" />
        <Button title={libraryExerciseId ? "Cambiar ejercicio de biblioteca" : "Elegir de biblioteca"}
          variant="secondary" small onPress={() => openExerciseLibrary(modal === "exercise" ? editingRoutineId : null, modal === "freeExercise")} />
        {libraryExerciseId ? <Text style={styles.helperText}>
          {exerciseLibrary.find((entry) => entry.id === libraryExerciseId)?.muscleGroup || "Grupo muscular"} · registrado en la biblioteca
        </Text> : null}
        <View style={styles.formRow}>
          <Field label="Series" value={targetSets} onChangeText={setTargetSets} keyboardType="numeric" />
          <Field label="RIR objetivo" value={targetRir} onChangeText={setTargetRir} keyboardType="decimal-pad" />
        </View>
        <View style={styles.formRow}>
          <Field label="Reps mínimas" value={minReps} onChangeText={setMinReps} keyboardType="numeric" />
          <Field label="Reps máximas" value={maxReps} onChangeText={setMaxReps} keyboardType="numeric" />
        </View>
        <Field label="Descanso" value={restSeconds} onChangeText={setRestSeconds} keyboardType="numeric" suffix="segundos" />
      </>;
    } else if (modal === "measure") {
      title = editMeasurement ? "Editar medición" : "Medidas de esta semana";
      onSave = () => void persistMeasurement();
      content = <>
        <Text style={styles.helperText}>Una medición semanal. Si ya hay una, esta acción la actualizará.</Text>
        {MEASURE_FIELDS.map(({ key, label, unit }) => <Field key={String(key)} label={label}
          value={measureValues[String(key)] || ""} onChangeText={(value) =>
            setMeasureValues((current) => ({ ...current, [String(key)]: value }))}
          keyboardType="decimal-pad" suffix={unit} />)}
      </>;
    } else if (modal === "performance") {
      title = "Registrar marca";
      onSave = () => void persistPerformance();
      content = <>
        <Text style={styles.helperText}>Registra peso y repeticiones, sin estimar 1RM.</Text>
        <Field label="Ejercicio" value={performanceExercise} onChangeText={setPerformanceExercise} placeholder="Ej. Press banca" />
        <View style={styles.formRow}>
          <Field label={`Peso (${weightUnit})`} value={performanceWeight} onChangeText={setPerformanceWeight} keyboardType="decimal-pad" />
          <Field label="Repeticiones" value={performanceReps} onChangeText={setPerformanceReps} keyboardType="numeric" />
        </View>
      </>;
    } else if (modal === "group") {
      const routine = routines.find((item) => item.id === groupRoutineId);
      title = "Agrupar ejercicios";
      saveLabel = groupType === "superset" ? "Crear superset" : "Crear circuito";
      onSave = () => void persistExerciseGrouping();
      content = routine ? <>
        <Text style={styles.helperText}>Elige el tipo y selecciona al menos dos ejercicios. Puedes mantenerlos presionados para ordenar la rutina.</Text>
        <View style={styles.groupTypeSelector}>
          {(["superset", "circuit"] as const).map((type) => {
            const selected = groupType === type;
            return <Pressable key={type} accessibilityRole="button" accessibilityState={{ selected }}
              onPress={() => setGroupType(type)}
              style={[styles.groupTypeOption, selected && styles.groupTypeOptionSelected]}>
              <Text style={[styles.groupTypeTitle, selected && styles.groupTypeTitleSelected]}>
                {type === "superset" ? "Superset" : "Circuito"}
              </Text>
              <Text style={styles.groupTypeDescription}>
                {type === "superset" ? "Alternar ejercicios serie a serie" : "Completar varias rondas"}
              </Text>
            </Pressable>;
          })}
        </View>
        <Text style={styles.fieldLabel}>Ejercicios seleccionados: {groupSelectedIds.length}</Text>
        {routine.exercises.map((exercise) => {
          const selected = groupSelectedIds.includes(exercise.id);
          return <Pressable key={exercise.id} accessibilityRole="checkbox" accessibilityState={{ checked: selected }}
            onPress={() => setGroupSelectedIds((ids) => selected
              ? ids.filter((id) => id !== exercise.id) : [...ids, exercise.id])}
            style={[styles.groupExerciseOption, selected && styles.groupExerciseOptionSelected]}>
            <View style={[styles.groupCheckbox, selected && styles.groupCheckboxSelected]}>
              <Text style={styles.groupCheckboxMark}>{selected ? "✓" : ""}</Text>
            </View>
            <Text style={styles.groupExerciseName}>{exercise.name}</Text>
            {exercise.groupType ? <Text style={styles.metaText}>{exercise.groupType === "superset" ? "En superset" : "En circuito"}</Text> : null}
          </Pressable>;
        })}
      </> : <Text style={styles.bodyText}>No se encontró la rutina.</Text>;
    } else if (modal === "library") {
      title = "Biblioteca de ejercicios";
      saveLabel = libraryRoutineId || libraryUseForSession ? "Volver al ejercicio" : "Cerrar";
      onSave = closeExerciseLibrary;
      const muscleGroups = [...new Set(exerciseLibrary.map((entry) => entry.muscleGroup))].sort((a, b) => a.localeCompare(b, "es"));
      const query = librarySearch.trim().toLocaleLowerCase("es");
      const filtered = exerciseLibrary.filter((entry) =>
        (!libraryMuscleFilter || entry.muscleGroup === libraryMuscleFilter) &&
        (!query || [entry.name, entry.muscleGroup, entry.equipment, entry.instructions, entry.alternatives]
          .some((value) => value.toLocaleLowerCase("es").includes(query))));
      content = <>
        <Text style={styles.helperText}>
          {libraryRoutineId || libraryUseForSession
            ? "Elige un ejercicio; sus instrucciones y alternativas quedarán vinculadas a la rutina y al historial."
            : "Explora los grupos musculares, el equipo y las indicaciones. Tus ejercicios personalizados también permanecen aquí."}
        </Text>
        <Field label="Buscar" value={librarySearch} onChangeText={setLibrarySearch} placeholder="Nombre, músculo o equipo" />
        <View style={styles.dayChips}>
          {["", ...muscleGroups].map((group) => {
            const selected = libraryMuscleFilter === group;
            return <Pressable key={group || "all"} accessibilityRole="button" accessibilityState={{ selected }}
              onPress={() => setLibraryMuscleFilter(group)} style={[styles.dayChip, selected && styles.dayChipSelected]}>
              <Text style={[styles.dayChipText, selected && styles.dayChipTextSelected]}>{group || "Todos"}</Text>
            </Pressable>;
          })}
        </View>
        {libraryFormOpen ? <Card style={styles.libraryForm}>
          <Text style={styles.sectionTitle}>{libraryEditingId ? "Editar ejercicio" : "Nuevo ejercicio personalizado"}</Text>
          <Field label="Nombre" value={libraryName} onChangeText={setLibraryName} placeholder="Ej. Remo con banda" />
          <Field label="Grupo muscular principal" value={libraryMuscleGroup} onChangeText={setLibraryMuscleGroup} placeholder="Ej. Espalda" />
          <Field label="Equipo" value={libraryEquipment} onChangeText={setLibraryEquipment} placeholder="Ej. Banda elástica" />
          <Field label="Instrucciones" value={libraryInstructions} onChangeText={setLibraryInstructions} multiline placeholder="Puntos técnicos que quieras recordar" />
          <Field label="Alternativas" value={libraryAlternatives} onChangeText={setLibraryAlternatives} multiline placeholder="Ej. Remo sentado, remo con mancuerna" />
          <Button title={libraryEditingId ? "Guardar cambios" : "Crear ejercicio"} onPress={() => void persistLibraryEntry()} />
        </Card> : null}
        {filtered.length ? filtered.map((entry) => (
          <Card key={entry.id} style={styles.libraryEntry}>
            <View style={styles.cardTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.exerciseName}>{entry.name}</Text>
                <Text style={styles.metaText}>{entry.muscleGroup} · {entry.equipment || "Equipo no especificado"}</Text>
              </View>
              {entry.isCustom ? <Text style={styles.libraryCustomBadge}>PERSONAL</Text> : null}
            </View>
            {entry.instructions ? <Text style={styles.libraryDescription}>{entry.instructions}</Text> : null}
            {entry.alternatives ? <Text style={styles.metaText}>Alternativas: {entry.alternatives}</Text> : null}
            <View style={styles.buttonRow}>
              <Button title="Editar ficha" variant="secondary" small onPress={() => openLibraryForm(entry)} />
              {libraryRoutineId || libraryUseForSession ? <Button
                title={libraryRoutineId ? "Usar en rutina" : "Añadir a sesión"} small
                onPress={() => selectLibraryEntry(entry)} /> : null}
            </View>
          </Card>
        )) : <EmptyState title="No hay coincidencias" text="Prueba otro nombre o grupo muscular, o crea un ejercicio personalizado." />}
        <Button title={libraryFormOpen ? "Cancelar edición" : "+ Crear ejercicio personalizado"}
          variant="secondary" onPress={() => libraryFormOpen ? setLibraryFormOpen(false) : openLibraryForm()} />
        <Text style={styles.helperText}>Los ejercicios no se eliminan para conservar el historial asociado.</Text>
      </>;
    }
    return (
      <Modal visible={isVisible} animationType="slide" transparent onRequestClose={() => modal === "library" ? closeExerciseLibrary() : setModal(null)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.modalSheet}>
            <View style={styles.modalTop}><View style={styles.modalHandle} /><Pressable onPress={() => modal === "library" ? closeExerciseLibrary() : setModal(null)}><Text style={styles.modalClose}>×</Text></Pressable></View>
            <Text style={styles.modalTitle}>{title}</Text>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={styles.modalContent}>{content}</ScrollView>
            <Button title={saveLabel} onPress={onSave} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  if (busy) {
    return <ThemeContext.Provider value={COLORS}><View style={styles.loading}><StatusBar style={COLORS.statusBar} /><Text style={styles.brand}>DIARIO FIT</Text><Text style={styles.bodyText}>Preparando tu base local…</Text></View></ThemeContext.Provider>;
  }
  if (error && routines.length === 0 && sessions.length === 0) {
    return <ThemeContext.Provider value={COLORS}><View style={styles.loading}><StatusBar style={COLORS.statusBar} /><Text style={styles.brand}>No se pudo iniciar</Text><Text style={styles.bodyText}>{error}</Text>
      <Button title="Reintentar" onPress={() => { setBusy(true); setError(""); refresh().catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Error")).finally(() => setBusy(false)); }} /></View></ThemeContext.Provider>;
  }

  if (showOnboarding) return renderOnboarding();

  const content = screen === "Inicio" ? renderHome()
    : screen === "Rutinas" ? renderRoutines()
      : screen === "Entrenar" ? renderWorkout()
        : screen === "Sesiones" ? renderSessions()
          : screen === "Progreso" ? renderProgress()
            : renderSettings();

  return (
    <ThemeContext.Provider value={COLORS}>
    <GestureHandlerRootView style={styles.app}>
      <StatusBar style={COLORS.statusBar} />
      {screen === "Rutinas" ? (
        <NestableScrollContainer contentContainerStyle={[styles.scrollContent, secondsRemaining !== null && styles.scrollContentWithTimer]} keyboardShouldPersistTaps="handled">
          {content}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </NestableScrollContainer>
      ) : (
        <ScrollView contentContainerStyle={[styles.scrollContent, secondsRemaining !== null && styles.scrollContentWithTimer]} keyboardShouldPersistTaps="handled">
          {content}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </ScrollView>
      )}
      {secondsRemaining !== null ? (
        <View style={styles.restDock}>
          <View style={styles.restDockCopy}>
            <Text style={styles.restDockLabel}>DESCANSO</Text>
            <Text style={styles.restDockTimer}>{Math.floor(secondsRemaining / 60)}:{String(secondsRemaining % 60).padStart(2, "0")}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Añadir 30 segundos de descanso"
            style={styles.restDockButton} onPress={() => setSecondsRemaining((value) => (value || 0) + 30)}>
            <Text style={styles.restDockButtonText}>+30s</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Saltar descanso"
            style={styles.restDockSkip} onPress={() => setSecondsRemaining(null)}>
            <Text style={styles.restDockSkipText}>Saltar</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={styles.bottomNav}>
        {(["Inicio", "Rutinas", "Entrenar", "Sesiones", "Progreso"] as Screen[]).map((item) => (
          <Pressable key={item} onPress={() => setScreen(item)} style={styles.navItem}>
            <Text style={[styles.navIcon, screen === item && styles.navSelected]}>{({
              Inicio: "◫", Rutinas: "▤", Entrenar: "＋", Sesiones: "◷", Progreso: "⌁"
            } as Record<string, string>)[item]}</Text>
            <Text style={[styles.navLabel, screen === item && styles.navSelected]}>{item}</Text>
          </Pressable>
        ))}
      </View>
      {toast ? <View style={[styles.toast, secondsRemaining !== null && styles.toastAboveTimer]}>
        <Text style={styles.toastText}>{toast}</Text>
        {undoSetSnapshot ? <Pressable accessibilityRole="button" onPress={() => void undoSetRemoval()}><Text style={styles.undoActionText}>Deshacer</Text></Pressable> : null}
      </View> : null}
      {renderModal()}
    </GestureHandlerRootView>
    </ThemeContext.Provider>
  );
}

function parseNullable(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function SessionCard({ session, onOpen, onDelete }: { session: WorkoutSession; onOpen: () => void; onDelete?: () => void }) {
  const { styles } = useThemeStyles();
  const best = session.exercises.map((exercise) => `${exercise.name}${bestSet(exercise.sets)
    ? ` · ${displayNumber(bestSet(exercise.sets)?.weight)} × ${bestSet(exercise.sets)?.reps}` : ""}`).join(" · ");
  const context = [
    session.energyRating === null ? null : `Energía ${session.energyRating}/5`,
    session.sleepHours === null ? null : `${displayNumber(session.sleepHours)} h sueño`,
    session.waterMl === null ? null : `${session.waterMl} ml agua`,
    session.supplements ? `Suplementos: ${session.supplements}` : null,
    session.discomfortNotes ? "Molestias anotadas" : null
  ].filter(Boolean).join(" · ");
  return (
    <Pressable onPress={onOpen} style={styles.sessionCard}>
      <View style={styles.cardTopRow}><View style={{ flex: 1 }}><Text style={styles.exerciseName}>{session.name}</Text>
        <Text style={styles.metaText}>#{session.sessionNumber} · {formatDate(session.date)} · {sessionDuration(session)} · {session.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0)} series</Text></View>
        {onDelete ? <Pressable onPress={(event) => { event.stopPropagation(); onDelete(); }}><Text style={styles.removeSetText}>×</Text></Pressable> : null}
      </View>
      {best ? <Text style={styles.sessionSummary}>{best}</Text> : null}
      {context ? <Text numberOfLines={2} style={styles.sessionContext}>{context}</Text> : null}
      {session.conclusions ? <Text style={styles.sessionNotes}>“{session.conclusions}”</Text> : null}
    </Pressable>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  const { styles } = useThemeStyles();
  return <View style={styles.emptyState}><Text style={styles.emptyIcon}>＋</Text><Text style={styles.cardTitle}>{title}</Text><Text style={styles.bodyText}>{text}</Text></View>;
}

function createStyles(COLORS: typeof LIGHT_COLORS) {
  return StyleSheet.create({
  app: { flex: 1, backgroundColor: COLORS.paper, paddingTop: Platform.OS === "android" ? 7 : 0 },
  scrollContent: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 22 },
  scrollContentWithTimer: { paddingBottom: 108 },
  pageHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  eyebrow: { color: COLORS.green, fontSize: 10, letterSpacing: 1.4, fontWeight: "800", marginBottom: 7 },
  pageTitle: { color: COLORS.ink, fontSize: 28, fontWeight: "800", letterSpacing: -0.8 },
  pageSubtitle: { color: COLORS.muted, fontSize: 12, marginTop: 5, maxWidth: 280, lineHeight: 18 },
  settingsButton: { width: 40, height: 40, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  settingsButtonText: { color: COLORS.green, fontSize: 19 },
  card: { backgroundColor: COLORS.white, borderColor: COLORS.line, borderWidth: 1, borderRadius: 15, padding: 16, marginBottom: 12 },
  cardKicker: { color: COLORS.green, fontSize: 9, letterSpacing: 1.3, fontWeight: "800", marginBottom: 8 },
  todayCard: { backgroundColor: COLORS.darkGreen, borderColor: COLORS.darkGreen, padding: 19, marginBottom: 20 },
  cardTitle: { color: COLORS.ink, fontSize: 16, fontWeight: "800", marginBottom: 5 },
  bodyText: { color: COLORS.muted, fontSize: 12, lineHeight: 18, marginBottom: 13 },
  metaText: { color: COLORS.muted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 9, marginBottom: 11 },
  sectionTitle: { color: COLORS.ink, fontWeight: "800", fontSize: 15 },
  actionText: { color: COLORS.green, fontWeight: "700", fontSize: 11 },
  button: { minHeight: 43, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 14, paddingVertical: 10, backgroundColor: COLORS.green, marginVertical: 4 },
  buttonSecondary: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line },
  buttonDanger: { backgroundColor: COLORS.dangerSurface, borderWidth: 1, borderColor: COLORS.dangerBorder },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: COLORS.onPrimary, fontSize: 12, fontWeight: "800" },
  buttonSecondaryText: { color: COLORS.ink },
  buttonDangerText: { color: COLORS.red },
  buttonSmall: { minHeight: 34, paddingVertical: 7, paddingHorizontal: 10, marginRight: 7 },
  buttonRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", marginTop: 7 },
  statsGrid: { flexDirection: "row", gap: 10, marginBottom: 8 },
  statCard: { flex: 1, marginBottom: 10, paddingVertical: 14 },
  statLabel: { color: COLORS.muted, fontSize: 9, fontWeight: "700", letterSpacing: 0.3 },
  statValue: { color: COLORS.ink, fontSize: 24, fontWeight: "800", marginTop: 5 },
  statTarget: { color: COLORS.muted, fontSize: 14, fontWeight: "600" },
  statFoot: { color: COLORS.muted, fontSize: 9, marginTop: 3 },
  goalTrack: { height: 5, borderRadius: 5, backgroundColor: COLORS.softTrack, overflow: "hidden", marginTop: 9 },
  goalFill: { height: "100%", borderRadius: 5, backgroundColor: COLORS.green },
  todayCardTitle: { color: COLORS.onDark },
  todayCardBody: { color: COLORS.textOnDark },
  todayCardKicker: { color: COLORS.lime },
  suggestionText: { color: COLORS.green, fontSize: 10, fontWeight: "700", marginTop: 6, lineHeight: 15 },
  scheduleRow: { minHeight: 39, flexDirection: "row", alignItems: "center", borderBottomColor: COLORS.subtleLine, borderBottomWidth: 1 },
  scheduleDay: { width: 39, color: COLORS.ink, fontWeight: "700", fontSize: 11 },
  scheduleRoutine: { color: COLORS.ink, fontSize: 11, flex: 1 },
  scheduleRest: { color: COLORS.muted, fontSize: 11, flex: 1 },
  scheduleMark: { color: COLORS.green, fontSize: 8 },
  scheduleDash: { color: COLORS.neutral, fontSize: 11 },
  metricInline: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 },
  chartHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  chartMainValue: { color: COLORS.ink, fontSize: 23, fontWeight: "800", marginTop: 3 },
  chartChange: { color: COLORS.green, backgroundColor: COLORS.softGreen, borderRadius: 10, overflow: "hidden", paddingHorizontal: 9, paddingVertical: 6, fontSize: 10, fontWeight: "800" },
  chartChangeDown: { color: COLORS.chartChangeDown },
  progressChangeDown: { color: COLORS.red, backgroundColor: COLORS.dangerSurface },
  progressSummary: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 6, marginBottom: 8 },
  progressChips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  progressChipScroll: { flexDirection: "row", gap: 6, paddingBottom: 6 },
  progressChip: { borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.white, borderRadius: 9, paddingVertical: 8, paddingHorizontal: 11 },
  progressChipSelected: { backgroundColor: COLORS.softGreen, borderColor: COLORS.selectedBorder },
  progressChipText: { color: COLORS.muted, fontSize: 9, fontWeight: "700" },
  progressChipTextSelected: { color: COLORS.green },
  progressChart: { height: 118, flexDirection: "row", alignItems: "flex-end", gap: 5, marginTop: 6, paddingHorizontal: 3 },
  progressChartColumn: { width: 62, height: "100%", alignItems: "center", justifyContent: "flex-end" },
  progressChartValue: { color: COLORS.muted, fontSize: 8, marginBottom: 4 },
  progressChartTrack: { height: 76, width: "100%", alignItems: "center", justifyContent: "flex-end" },
  progressChartBar: { width: 27, minHeight: 12, borderTopLeftRadius: 6, borderTopRightRadius: 6, backgroundColor: COLORS.chartBar },
  progressChartBarCurrent: { backgroundColor: COLORS.green },
  progressChartDate: { color: COLORS.muted, fontSize: 8, marginTop: 5 },
  weightChart: { height: 105, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around", gap: 8, marginTop: 14 },
  weightChartColumn: { flex: 1, height: "100%", alignItems: "center", justifyContent: "flex-end" },
  weightChartValue: { color: COLORS.muted, fontSize: 8, marginBottom: 4 },
  weightChartTrack: { height: 64, width: "100%", alignItems: "center", justifyContent: "flex-end" },
  weightChartBar: { width: "54%", minHeight: 12, borderTopLeftRadius: 5, borderTopRightRadius: 5, backgroundColor: COLORS.chartBar },
  weightChartBarCurrent: { backgroundColor: COLORS.green },
  weightChartDate: { color: COLORS.muted, fontSize: 8, marginTop: 5 },
  chartCaption: { color: COLORS.muted, fontSize: 9, marginTop: 9 },
  analyticsMainValue: { color: COLORS.ink, fontSize: 20, fontWeight: "800", marginTop: 8, marginBottom: 3 },
  analyticsWeekRow: { minHeight: 40, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, borderBottomWidth: 1, borderBottomColor: COLORS.subtleLine, paddingVertical: 6 },
  analyticsWeekCount: { color: COLORS.green, fontSize: 10, fontWeight: "800", textAlign: "right" },
  routineCard: { paddingVertical: 17 },
  cardTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  exerciseSummary: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 8, borderTopColor: COLORS.subtleLine, borderTopWidth: 1 },
  exerciseSummaryMain: { flex: 1, paddingVertical: 6 },
  draggingExercise: { backgroundColor: COLORS.softGreen, borderRadius: 9, paddingHorizontal: 6 },
  dragHandle: { width: 30, height: 40, alignItems: "center", justifyContent: "center" },
  dragHandleText: { color: COLORS.handle, fontSize: 21, fontWeight: "700" },
  groupBadgeText: { color: COLORS.green, fontSize: 8, letterSpacing: 0.6, fontWeight: "900", marginTop: 4 },
  groupRemoveButton: { width: 25, height: 30, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.dangerSurface, borderRadius: 7 },
  groupRemoveText: { color: COLORS.red, fontSize: 16, fontWeight: "700" },
  emptyRoutineText: { color: COLORS.muted, fontSize: 10, lineHeight: 16, paddingVertical: 12 },
  exerciseName: { color: COLORS.ink, fontSize: 12, fontWeight: "700" },
  chevron: { color: COLORS.muted, fontSize: 22 },
  exerciseCard: { padding: 14 },
  setEntry: { backgroundColor: COLORS.surfaceSubtle, borderColor: COLORS.line, borderWidth: 1, borderRadius: 12, padding: 10, marginTop: 9 },
  setEntryHeader: { flexDirection: "row", alignItems: "center", minHeight: 34, marginBottom: 8 },
  setBadge: { width: 25, height: 25, alignItems: "center", justifyContent: "center", borderRadius: 9, backgroundColor: COLORS.softGreen },
  setBadgeText: { color: COLORS.green, fontSize: 11, fontWeight: "900" },
  setEntryTitle: { color: COLORS.ink, fontSize: 12, fontWeight: "800", marginLeft: 8, flex: 1 },
  copySetButton: { paddingHorizontal: 7, paddingVertical: 7, marginRight: 4 },
  copySetText: { color: COLORS.green, fontSize: 9, fontWeight: "800" },
  setFields: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  setField: { flex: 1, minWidth: 0 },
  setFieldLabel: { color: COLORS.muted, fontSize: 8, fontWeight: "800", marginBottom: 4, textAlign: "center" },
  setInput: { height: 48, minWidth: 0, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, borderRadius: 9, paddingHorizontal: 3, textAlign: "center", fontSize: 16, fontWeight: "700", color: COLORS.ink },
  checkButton: { width: 45, height: 48, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.green, borderRadius: 10 },
  checkText: { color: COLORS.onPrimary, fontSize: 19, fontWeight: "800" },
  removeSetButton: { width: 29, height: 34, alignItems: "center", justifyContent: "center" },
  removeSetText: { color: COLORS.red, fontSize: 22, fontWeight: "500" },
  field: { marginTop: 10, marginBottom: 4, flex: 1 },
  fieldLabel: { color: COLORS.fieldLabel, fontSize: 10, fontWeight: "800", marginBottom: 6 },
  inputRow: { flexDirection: "row", alignItems: "center" },
  input: { minHeight: 43, flex: 1, borderColor: COLORS.line, borderWidth: 1, borderRadius: 8, backgroundColor: COLORS.white, color: COLORS.ink, fontSize: 12, paddingHorizontal: 11, paddingVertical: 9 },
  inputWithSuffix: { borderTopRightRadius: 0, borderBottomRightRadius: 0 },
  inputSuffix: { backgroundColor: COLORS.inputSurface, minHeight: 43, textAlignVertical: "center", paddingHorizontal: 9, borderColor: COLORS.line, borderWidth: 1, borderLeftWidth: 0, borderTopRightRadius: 8, borderBottomRightRadius: 8, overflow: "hidden", color: COLORS.muted, fontSize: 10 },
  textArea: { minHeight: 70, textAlignVertical: "top" },
  formRow: { flexDirection: "row", gap: 10 },
  dayChips: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginVertical: 10 },
  dayChip: { borderColor: COLORS.line, borderWidth: 1, backgroundColor: COLORS.white, borderRadius: 9, paddingVertical: 9, paddingHorizontal: 11, minWidth: 45, alignItems: "center" },
  dayChipSelected: { backgroundColor: COLORS.softGreen, borderColor: COLORS.selectedBorder },
  dayChipText: { color: COLORS.muted, fontSize: 10, fontWeight: "700" },
  dayChipTextSelected: { color: COLORS.green },
  helperText: { color: COLORS.muted, fontSize: 10, lineHeight: 16, marginBottom: 6 },
  groupTypeSelector: { flexDirection: "row", gap: 8, marginTop: 6, marginBottom: 14 },
  groupTypeOption: { flex: 1, backgroundColor: COLORS.white, borderColor: COLORS.line, borderWidth: 1, borderRadius: 10, padding: 10 },
  groupTypeOptionSelected: { backgroundColor: COLORS.softGreen, borderColor: COLORS.selectedBorder },
  groupTypeTitle: { color: COLORS.ink, fontSize: 11, fontWeight: "800" },
  groupTypeTitleSelected: { color: COLORS.green },
  groupTypeDescription: { color: COLORS.muted, fontSize: 8, lineHeight: 12, marginTop: 4 },
  groupExerciseOption: { flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: COLORS.white, borderColor: COLORS.line, borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 7 },
  groupExerciseOptionSelected: { backgroundColor: COLORS.softGreen, borderColor: COLORS.selectedBorder },
  groupCheckbox: { width: 21, height: 21, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.checkboxBorder, borderRadius: 7 },
  groupCheckboxSelected: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  groupCheckboxMark: { color: COLORS.onPrimary, fontSize: 12, fontWeight: "900" },
  groupExerciseName: { flex: 1, color: COLORS.ink, fontSize: 11, fontWeight: "700" },
  libraryEntry: { padding: 13 },
  libraryForm: { borderColor: COLORS.selectedBorder, borderWidth: 1 },
  libraryDescription: { color: COLORS.secondaryText, fontSize: 10, lineHeight: 15, marginTop: 8 },
  libraryCustomBadge: { color: COLORS.green, backgroundColor: COLORS.softGreen, overflow: "hidden", borderRadius: 7, paddingHorizontal: 7, paddingVertical: 4, fontSize: 7, fontWeight: "900" },
  activeBanner: { backgroundColor: COLORS.darkGreen, borderRadius: 12, padding: 15, marginBottom: 14 },
  activeBannerTitle: { color: COLORS.onDark, fontSize: 12, fontWeight: "800" },
  activeBannerSub: { color: COLORS.textOnDark, fontSize: 10, marginTop: 5 },
  workoutTop: { backgroundColor: COLORS.softGreen, borderRadius: 10, padding: 13, marginBottom: 12 },
  workoutTopTitle: { color: COLORS.green, fontWeight: "800", fontSize: 11 },
  workoutTopSub: { color: COLORS.workoutSubtle, fontSize: 10, marginTop: 4 },
  focusHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 3, marginBottom: 5 },
  focusEyebrow: { color: COLORS.green, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  focusProgressText: { color: COLORS.muted, fontSize: 10, marginTop: 3 },
  focusNav: { flexDirection: "row", gap: 7 },
  focusNavButton: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line },
  focusNavDisabled: { opacity: 0.35 },
  focusNavText: { color: COLORS.green, fontSize: 24, lineHeight: 26, fontWeight: "700" },
  exerciseDots: { flexDirection: "row", alignItems: "center", paddingVertical: 8, gap: 8 },
  exerciseDot: { width: 30, height: 30, borderRadius: 11, backgroundColor: COLORS.white, borderColor: COLORS.line, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  exerciseDotSelected: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  exerciseDotText: { color: COLORS.muted, fontSize: 10, fontWeight: "800" },
  exerciseDotTextSelected: { color: COLORS.onPrimary },
  exerciseFocusTitle: { color: COLORS.ink, fontSize: 21, fontWeight: "900", letterSpacing: -0.3, marginBottom: 4 },
  previousSession: { backgroundColor: COLORS.previousSurface, borderRadius: 10, padding: 10, marginTop: 12, marginBottom: 3 },
  previousSessionTitle: { color: COLORS.green, fontSize: 8, letterSpacing: 0.7, fontWeight: "900" },
  previousSessionValues: { color: COLORS.previousText, fontSize: 10, lineHeight: 17, marginTop: 4 },
  contextCard: { padding: 13 },
  contextToggle: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 46 },
  contextDuration: { color: COLORS.green, fontSize: 9, fontWeight: "800", marginTop: 5 },
  contextFieldLabel: { marginTop: 12 },
  energyOptions: { flexDirection: "row", gap: 5, marginTop: 3, marginBottom: 5 },
  energyOption: { flex: 1, minHeight: 49, minWidth: 0, alignItems: "center", justifyContent: "center", paddingVertical: 5, paddingHorizontal: 2, borderWidth: 1, borderColor: COLORS.line, borderRadius: 9, backgroundColor: COLORS.white },
  energyOptionSelected: { backgroundColor: COLORS.softGreen, borderColor: COLORS.selectedBorder },
  energyNumber: { color: COLORS.ink, fontSize: 12, fontWeight: "900" },
  energyLabel: { color: COLORS.muted, fontSize: 7, textAlign: "center", marginTop: 2 },
  energySelectedText: { color: COLORS.green },
  contextSaveHint: { color: COLORS.muted, fontSize: 9, lineHeight: 14, marginTop: 8 },
  restDock: { position: "absolute", bottom: 67, left: 12, right: 12, minHeight: 60, backgroundColor: COLORS.darkGreen, borderRadius: 15, flexDirection: "row", alignItems: "center", paddingHorizontal: 13, paddingVertical: 8, gap: 8, shadowColor: COLORS.shadow, shadowOpacity: 0.18, shadowRadius: 12, elevation: 8 },
  restDockCopy: { flex: 1 },
  restDockLabel: { color: COLORS.textOnDark, fontSize: 8, letterSpacing: 1, fontWeight: "800" },
  restDockTimer: { color: COLORS.lime, fontSize: 22, fontWeight: "900", marginTop: 1 },
  restDockButton: { minWidth: 53, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.restButton },
  restDockButtonText: { color: COLORS.onDark, fontSize: 11, fontWeight: "800" },
  restDockSkip: { minWidth: 58, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.lime },
  restDockSkipText: { color: COLORS.darkGreen, fontSize: 10, fontWeight: "900" },
  sessionCard: { backgroundColor: COLORS.white, borderColor: COLORS.line, borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  sessionSummary: { color: COLORS.secondaryText, fontSize: 10, lineHeight: 16, marginTop: 8 },
  sessionContext: { color: COLORS.muted, fontSize: 9, lineHeight: 14, marginTop: 6 },
  sessionNotes: { color: COLORS.muted, fontSize: 10, fontStyle: "italic", marginTop: 7 },
  measureCard: { paddingVertical: 15 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 12 },
  metricCell: { width: "50%", paddingVertical: 8, paddingRight: 6 },
  metricValue: { color: COLORS.ink, fontSize: 17, fontWeight: "800", marginTop: 4 },
  metricUnit: { color: COLORS.muted, fontSize: 10, fontWeight: "500" },
  recordRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 13 },
  recordValue: { color: COLORS.green, fontWeight: "800", fontSize: 12 },
  recordHighlight: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: COLORS.surfaceSubtle },
  prBadge: { width: 43, height: 43, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.softGreen },
  prBadgeText: { color: COLORS.green, fontSize: 12, fontWeight: "900" },
  prValue: { color: COLORS.green, fontSize: 14, fontWeight: "800", marginTop: 2 },
  settingRow: { flexDirection: "row", alignItems: "center", paddingVertical: 9 },
  emptyState: { alignItems: "center", paddingVertical: 28, paddingHorizontal: 20, backgroundColor: COLORS.white, borderColor: COLORS.line, borderWidth: 1, borderStyle: "dashed", borderRadius: 14, marginVertical: 8 },
  emptyIcon: { color: COLORS.green, fontSize: 23, backgroundColor: COLORS.softGreen, overflow: "hidden", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 10 },
  bottomNav: { minHeight: 61, backgroundColor: COLORS.white, borderTopColor: COLORS.line, borderTopWidth: 1, flexDirection: "row", justifyContent: "space-around", paddingBottom: Platform.OS === "android" ? 3 : 15, paddingTop: 7 },
  navItem: { alignItems: "center", justifyContent: "center", flex: 1, gap: 2 },
  navIcon: { color: COLORS.muted, fontSize: 18, lineHeight: 22 },
  navLabel: { color: COLORS.muted, fontSize: 8, fontWeight: "600" },
  navSelected: { color: COLORS.green, fontWeight: "800" },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(14,32,21,0.42)" },
  modalSheet: { backgroundColor: COLORS.paper, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 19, paddingTop: 8, paddingBottom: Platform.OS === "android" ? 20 : 32, maxHeight: "92%" },
  modalTop: { position: "relative", flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 11, minHeight: 24 },
  modalHandle: { width: 38, height: 4, borderRadius: 4, backgroundColor: COLORS.checkboxBorder },
  modalClose: { position: "absolute", right: 0, top: -13, color: COLORS.muted, fontSize: 24, padding: 5 },
  modalTitle: { color: COLORS.ink, fontSize: 20, fontWeight: "800", marginBottom: 12 },
  modalContent: { marginBottom: 9 },
  bottomPadding: { height: 10 },
  toast: { position: "absolute", alignSelf: "center", bottom: 76, backgroundColor: COLORS.darkGreen, borderRadius: 10, paddingHorizontal: 15, paddingVertical: 11, maxWidth: "90%", flexDirection: "row", alignItems: "center", gap: 18 },
  toastAboveTimer: { bottom: 136 },
  toastText: { color: COLORS.onDark, fontSize: 11, fontWeight: "600" },
  undoActionText: { color: COLORS.lime, fontSize: 11, fontWeight: "900" },
  errorText: { color: COLORS.red, fontSize: 11, marginTop: 10 },
  loading: { flex: 1, backgroundColor: COLORS.paper, alignItems: "center", justifyContent: "center", padding: 26 },
  brand: { color: COLORS.green, fontWeight: "900", fontSize: 17, letterSpacing: 1.5, marginBottom: 9 },
  onboardingScroll: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 22, paddingVertical: 28 },
  welcomeMark: { width: 48, height: 48, borderRadius: 16, backgroundColor: COLORS.darkGreen, alignItems: "center", justifyContent: "center", marginBottom: 21 },
  welcomeMarkText: { color: COLORS.lime, fontWeight: "900", fontSize: 14, letterSpacing: 0.6 },
  welcomeTitle: { color: COLORS.ink, fontSize: 32, fontWeight: "900", letterSpacing: -1, lineHeight: 37, marginTop: 1, marginBottom: 9 },
  welcomeDescription: { color: COLORS.muted, fontSize: 12, lineHeight: 19, marginBottom: 16 },
  onboardingCard: { padding: 17, borderRadius: 17 },
  daysLabel: { marginTop: 15 },
  unitSelector: { flexDirection: "row", gap: 9, marginBottom: 5 },
  unitOption: { flex: 1, paddingVertical: 12, paddingHorizontal: 11, borderWidth: 1, borderColor: COLORS.line, borderRadius: 10, backgroundColor: COLORS.white },
  unitOptionSelected: { backgroundColor: COLORS.softGreen, borderColor: COLORS.selectedBorder },
  unitOptionTitle: { color: COLORS.ink, fontSize: 11, fontWeight: "800" },
  unitOptionSubtitle: { color: COLORS.muted, fontSize: 9, marginTop: 3 },
  unitOptionTitleSelected: { color: COLORS.green },
  privacyNote: { color: COLORS.muted, fontSize: 10, lineHeight: 16, textAlign: "center", marginTop: 8, paddingHorizontal: 8 }
  });
}
