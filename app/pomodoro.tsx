import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { useSQLiteContext } from "expo-sqlite";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AppState,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAppTheme } from "@/src/theme/ThemeContext";

type Mode = "focus" | "short" | "long";
type Settings = { focus_minutes: number; short_break_minutes: number; long_break_minutes: number; long_break_interval: number; sound_enabled: number; notifications_enabled: number };
type Session = { id: number; duration_minutes: number; local_date: string; completed_at: string };

const COLORS = { bg: "#F7F8FC", ink: "#20243A", muted: "#85899B", purple: "#6C63FF", soft: "#EEECFF", card: "#FFFFFF", line: "#E8E9F1" };
const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const modeLabel = (mode: Mode) => mode === "focus" ? "Focus" : mode === "short" ? "Short break" : "Long break";

export default function PomodoroScreen() {
  const db = useSQLiteContext();
  const { colors } = useAppTheme();
  const [settings, setSettings] = useState<Settings>({ focus_minutes: 25, short_break_minutes: 5, long_break_minutes: 15, long_break_interval: 4, sound_enabled: 1, notifications_enabled: 1 });
  const [mode, setMode] = useState<Mode>("focus");
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [completedFocusCount, setCompletedFocusCount] = useState(0);
  const [totalFocusCount, setTotalFocusCount] = useState(0);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [history, setHistory] = useState<Session[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [draft, setDraft] = useState({ focus: "25", short: "5", long: "15", interval: "4" });
  const notificationId = useRef<string | null>(null);
  const completedRef = useRef(false);

  const durationSeconds = useMemo(() => mode === "focus" ? settings.focus_minutes * 60 : mode === "short" ? settings.short_break_minutes * 60 : settings.long_break_minutes * 60, [mode, settings]);

  const loadStats = useCallback(async () => {
    const today = localDate();
    const rows = await db.getAllAsync<Session>("SELECT id, duration_minutes, local_date, completed_at FROM pomodoro_sessions ORDER BY completed_at DESC LIMIT 30");
    const total = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM pomodoro_sessions");
    const todayRows = rows.filter((row) => row.local_date === today);
    setHistory(rows);
    setTotalFocusCount(total?.count ?? 0);
    setCompletedFocusCount(todayRows.length);
    setTodayMinutes(todayRows.reduce((sum, row) => sum + row.duration_minutes, 0));
  }, [db]);

  useEffect(() => { void (async () => { const row = await db.getFirstAsync<Settings>("SELECT focus_minutes, short_break_minutes, long_break_minutes, long_break_interval, sound_enabled, notifications_enabled FROM pomodoro_settings WHERE id = 1"); if (row) { setSettings(row); setRemaining(row.focus_minutes * 60); setDraft({ focus: String(row.focus_minutes), short: String(row.short_break_minutes), long: String(row.long_break_minutes), interval: String(row.long_break_interval) }); } await loadStats(); })(); }, [db, loadStats]);

  const cancelNotification = useCallback(async () => { if (notificationId.current) { await Notifications.cancelScheduledNotificationAsync(notificationId.current).catch(() => undefined); notificationId.current = null; } }, []);
  const scheduleNotification = useCallback(async (seconds: number, nextMode: Mode) => { await cancelNotification(); if (!settings.notifications_enabled) return; try { const permission = await Notifications.getPermissionsAsync(); if (permission.status !== "granted") { const requested = await Notifications.requestPermissionsAsync(); if (requested.status !== "granted") return; } notificationId.current = await Notifications.scheduleNotificationAsync({ content: { title: `${modeLabel(nextMode)} selesai`, body: nextMode === "focus" ? "Waktunya beristirahat." : "Siap kembali fokus?", sound: settings.sound_enabled ? "default" : undefined }, trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.max(1, seconds), repeats: false } }); } catch { /* Timer tidak bergantung pada notifikasi. */ } }, [cancelNotification, settings.notifications_enabled, settings.sound_enabled]);

  const finish = useCallback(async () => {
    if (completedRef.current) return;
    completedRef.current = true;
    await cancelNotification();
    if (mode === "focus" && startedAt) { await db.runAsync("INSERT INTO pomodoro_sessions (started_at, completed_at, duration_minutes, local_date) VALUES (?, ?, ?, ?)", startedAt, new Date().toISOString(), settings.focus_minutes, localDate()); await loadStats(); }
    const nextMode: Mode = mode === "focus" ? ((totalFocusCount + 1) % settings.long_break_interval === 0 ? "long" : "short") : "focus";
    setMode(nextMode); setRemaining(nextMode === "focus" ? settings.focus_minutes * 60 : nextMode === "short" ? settings.short_break_minutes * 60 : settings.long_break_minutes * 60); setRunning(false); setStartedAt(null); setEndTime(null);
  }, [cancelNotification, db, loadStats, mode, settings, startedAt, totalFocusCount]);

  const refreshTimer = useCallback(() => { if (!running || endTime === null) return; const next = Math.max(0, Math.ceil((endTime - Date.now()) / 1000)); setRemaining(next); if (next === 0) void finish(); }, [endTime, finish, running]);
  useEffect(() => { if (!running) return; const id = setInterval(refreshTimer, 250); return () => clearInterval(id); }, [refreshTimer, running]);
  useEffect(() => { const sub = AppState.addEventListener("change", (state) => { if (state === "active") refreshTimer(); }); return () => sub.remove(); }, [refreshTimer]);
  useEffect(() => { setRemaining(durationSeconds); }, [durationSeconds]);

  const toggle = async () => {
    if (running) { const next = endTime ? Math.max(0, Math.ceil((endTime - Date.now()) / 1000)) : remaining; setRemaining(next); setRunning(false); setEndTime(null); await cancelNotification(); return; }
    if (remaining <= 0) return;
    completedRef.current = false;
    const now = Date.now(); setEndTime(now + remaining * 1000); setRunning(true); if (!startedAt) setStartedAt(new Date(now).toISOString()); await scheduleNotification(remaining, mode);
  };
  const reset = async () => { if (running) { Alert.alert("Reset timer?", "Sesi aktif akan dikembalikan ke durasi awal.", [{ text: "Batal", style: "cancel" }, { text: "Reset", style: "destructive", onPress: () => { void cancelNotification(); setRunning(false); setEndTime(null); setStartedAt(null); setRemaining(durationSeconds); } }]); } else { await cancelNotification(); setStartedAt(null); setRemaining(durationSeconds); } };
  const skip = async () => { await cancelNotification(); const nextMode: Mode = mode === "focus" ? "short" : "focus"; setMode(nextMode); setRunning(false); setEndTime(null); setStartedAt(null); setRemaining(nextMode === "focus" ? settings.focus_minutes * 60 : settings.short_break_minutes * 60); };
  const saveSettings = async () => { const focus = Number(draft.focus), short = Number(draft.short), long = Number(draft.long), interval = Number(draft.interval); if (!Number.isInteger(focus) || focus < 1 || focus > 180 || !Number.isInteger(short) || short < 1 || short > 60 || !Number.isInteger(long) || long < 1 || long > 60 || !Number.isInteger(interval) || interval < 1 || interval > 12) { Alert.alert("Durasi tidak valid", "Focus 1–180 menit, break 1–60 menit, interval 1–12 sesi."); return; } const next = { focus_minutes: focus, short_break_minutes: short, long_break_minutes: long, long_break_interval: interval, sound_enabled: settings.sound_enabled, notifications_enabled: settings.notifications_enabled }; await db.runAsync("UPDATE pomodoro_settings SET focus_minutes = ?, short_break_minutes = ?, long_break_minutes = ?, long_break_interval = ?, sound_enabled = ?, notifications_enabled = ? WHERE id = 1", focus, short, long, interval, next.sound_enabled, next.notifications_enabled); setSettings(next); setShowSettings(false); if (!running) setRemaining(mode === "focus" ? focus * 60 : mode === "short" ? short * 60 : long * 60); };
  const minutes = String(Math.floor(remaining / 60)).padStart(2, "0"); const seconds = String(remaining % 60).padStart(2, "0"); const progress = durationSeconds ? Math.max(0, Math.min(1, remaining / durationSeconds)) : 0;

  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.header}><Pressable onPress={() => router.back()} hitSlop={12}><Ionicons name="arrow-back" size={25} color={colors.text} /></Pressable><Text style={[styles.eyebrow, { color: colors.muted }]}>FOCUS RITUAL</Text><Pressable onPress={() => setShowSettings(true)} hitSlop={12}><Ionicons name="settings-outline" size={23} color={colors.text} /></Pressable></View>
    <Text style={[styles.title, { color: colors.text }]}>Pomodoro</Text><Text style={[styles.subtitle, { color: colors.muted }]}>Satu blok waktu. Satu hal yang penting.</Text>
    <View style={[styles.modeRow, { backgroundColor: colors.input }]}>{(["focus", "short", "long"] as Mode[]).map((item) => <Pressable key={item} onPress={() => { if (running) return; setMode(item); }} style={[styles.mode, mode === item && [styles.modeActive, { backgroundColor: colors.card }]]}><Text style={[styles.modeText, { color: colors.muted }, mode === item && styles.modeTextActive]}>{modeLabel(item)}</Text></Pressable>)}</View>
    <View style={[styles.timerCard, { backgroundColor: colors.card }]}><Text style={styles.modeCaption}>{mode === "focus" ? "DEEP WORK" : "RECOVERY"}</Text><Text style={[styles.timer, { color: colors.text }]}>{minutes}:{seconds}</Text><View style={[styles.track, { backgroundColor: colors.primarySoft }]}><View style={[styles.fill, { width: `${(1 - progress) * 100}%` }]} /></View><Text style={[styles.timerHint, { color: colors.muted }]}>{running ? "Sedang berjalan" : remaining === durationSeconds ? "Siap dimulai" : "Dijeda"}</Text></View>
    <View style={styles.controls}><Pressable style={[styles.secondaryButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => void reset()}><Ionicons name="refresh" size={20} color={colors.text} /><Text style={[styles.secondaryText, { color: colors.text }]}>Reset</Text></Pressable><Pressable style={styles.primaryButton} onPress={() => void toggle()}><Ionicons name={running ? "pause" : "play"} size={21} color="#FFF" /><Text style={styles.primaryText}>{running ? "Pause" : "Start"}</Text></Pressable><Pressable style={[styles.secondaryButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => void skip()}><Text style={[styles.secondaryText, { color: colors.text }]}>Skip</Text><Ionicons name="play-skip-forward" size={20} color={colors.text} /></Pressable></View>
    <View style={styles.stats}><View><Text style={styles.statNumber}>{completedFocusCount}</Text><Text style={styles.statLabel}>sesi hari ini</Text></View><View style={styles.statDivider} /><View><Text style={styles.statNumber}>{todayMinutes}</Text><Text style={styles.statLabel}>menit fokus</Text></View></View>
    <View style={styles.historyHeader}><Text style={[styles.sectionTitle, { color: colors.text }]}>Riwayat sesi</Text><Text style={[styles.historyNote, { color: colors.muted }]}>30 terakhir</Text></View>{history.length === 0 ? <View style={[styles.empty, { backgroundColor: colors.card }]}><Ionicons name="hourglass-outline" size={24} color={colors.muted} /><Text style={[styles.emptyText, { color: colors.muted }]}>Selesaikan sesi Focus pertamamu untuk melihat riwayat.</Text></View> : history.slice(0, 8).map((session) => <View style={[styles.historyRow, { backgroundColor: colors.card }]} key={session.id}><View style={[styles.historyIcon, { backgroundColor: colors.primarySoft }]}><Ionicons name="checkmark" size={17} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={[styles.historyTitle, { color: colors.text }]}>{session.duration_minutes} menit fokus</Text><Text style={[styles.historyDate, { color: colors.muted }]}>{session.local_date}</Text></View><Text style={[styles.historyTime, { color: colors.muted }]}>{new Date(session.completed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text></View>)}
  </ScrollView><Modal visible={showSettings} transparent animationType="slide" onRequestClose={() => setShowSettings(false)}><View style={styles.modalBackdrop}><View style={[styles.modal, { backgroundColor: colors.background }]}><View style={styles.modalHeader}><Text style={[styles.modalTitle, { color: colors.text }]}>Pengaturan timer</Text><Pressable onPress={() => setShowSettings(false)}><Ionicons name="close" size={24} color={colors.muted} /></Pressable></View><Text style={[styles.modalHelp, { color: colors.muted }]}>{running ? "Selesaikan atau reset sesi aktif sebelum mengubah durasi." : "Durasi disimpan di perangkat ini."}</Text>{[["Focus", "focus"], ["Short break", "short"], ["Long break", "long"], ["Long break setiap", "interval"]].map(([label, key]) => <View style={styles.inputRow} key={key}><Text style={[styles.inputLabel, { color: colors.text }]}>{label}</Text><TextInput editable={!running} keyboardType="number-pad" value={draft[key as keyof typeof draft]} onChangeText={(value) => setDraft((current) => ({ ...current, [key]: value.replace(/[^0-9]/g, "") }))} style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }, running && styles.inputDisabled]} /><Text style={[styles.inputUnit, { color: colors.muted }]}>{key === "interval" ? "sesi" : "menit"}</Text></View>)}<View style={styles.soundRow}><Text style={[styles.inputLabel, { color: colors.text }]}>Suara notifikasi</Text><Switch value={settings.sound_enabled === 1} onValueChange={(value) => setSettings((current) => ({ ...current, sound_enabled: value ? 1 : 0 }))} trackColor={{ false: colors.border, true: colors.primary }} /></View><Pressable disabled={running} style={[styles.saveButton, running && styles.saveDisabled]} onPress={() => void saveSettings()}><Text style={styles.saveText}>Simpan pengaturan</Text></Pressable></View></View></Modal></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: COLORS.bg }, content: { padding: 22, paddingTop: 20, paddingBottom: 44 }, header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, eyebrow: { color: COLORS.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1.4 }, title: { color: COLORS.ink, fontSize: 32, fontWeight: "800", marginTop: 24 }, subtitle: { color: COLORS.muted, fontSize: 13, marginTop: 5 }, modeRow: { flexDirection: "row", backgroundColor: "#ECECF4", borderRadius: 14, padding: 4, marginTop: 28 }, mode: { flex: 1, paddingVertical: 11, alignItems: "center", borderRadius: 11 }, modeActive: { backgroundColor: COLORS.card, shadowColor: "#20243A", shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 }, modeText: { color: COLORS.muted, fontSize: 11, fontWeight: "700" }, modeTextActive: { color: COLORS.purple }, timerCard: { backgroundColor: COLORS.card, borderRadius: 28, marginTop: 18, padding: 28, alignItems: "center", shadowColor: "#20243A", shadowOpacity: 0.06, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, elevation: 2 }, modeCaption: { color: COLORS.purple, fontSize: 11, fontWeight: "800", letterSpacing: 1.5 }, timer: { color: COLORS.ink, fontSize: 74, fontWeight: "800", letterSpacing: -3, marginTop: 10 }, track: { width: "100%", height: 7, borderRadius: 4, backgroundColor: COLORS.soft, overflow: "hidden", marginTop: 22 }, fill: { height: "100%", backgroundColor: COLORS.purple, borderRadius: 4 }, timerHint: { color: COLORS.muted, fontSize: 12, marginTop: 12 }, controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16 }, primaryButton: { backgroundColor: COLORS.purple, borderRadius: 16, paddingHorizontal: 29, paddingVertical: 15, flexDirection: "row", alignItems: "center", gap: 8 }, primaryText: { color: "#FFF", fontWeight: "800", fontSize: 15 }, secondaryButton: { backgroundColor: COLORS.card, borderRadius: 15, paddingHorizontal: 13, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: COLORS.line }, secondaryText: { color: COLORS.ink, fontWeight: "700", fontSize: 12 }, stats: { backgroundColor: "#292D47", borderRadius: 20, marginTop: 26, padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-around" }, statNumber: { color: "#FFF", fontSize: 25, fontWeight: "800", textAlign: "center" }, statLabel: { color: "#B7BAD0", fontSize: 11, marginTop: 3 }, statDivider: { width: 1, height: 33, backgroundColor: "#545873" }, historyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 30, marginBottom: 12 }, sectionTitle: { color: COLORS.ink, fontSize: 19, fontWeight: "800" }, historyNote: { color: COLORS.muted, fontSize: 11 }, historyRow: { backgroundColor: COLORS.card, borderRadius: 16, padding: 13, marginBottom: 8, flexDirection: "row", alignItems: "center" }, historyIcon: { width: 31, height: 31, borderRadius: 11, backgroundColor: COLORS.soft, alignItems: "center", justifyContent: "center", marginRight: 11 }, historyTitle: { color: COLORS.ink, fontSize: 13, fontWeight: "700" }, historyDate: { color: COLORS.muted, fontSize: 11, marginTop: 3 }, historyTime: { color: COLORS.muted, fontSize: 12 }, empty: { backgroundColor: COLORS.card, padding: 22, borderRadius: 16, alignItems: "center" }, emptyText: { color: COLORS.muted, fontSize: 12, textAlign: "center", marginTop: 9, lineHeight: 18 }, modalBackdrop: { flex: 1, backgroundColor: "rgba(20,22,40,0.38)", justifyContent: "flex-end" }, modal: { backgroundColor: COLORS.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: 36 }, modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, modalTitle: { color: COLORS.ink, fontSize: 21, fontWeight: "800" }, modalHelp: { color: COLORS.muted, fontSize: 12, lineHeight: 18, marginTop: 7, marginBottom: 18 }, inputRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 }, inputLabel: { flex: 1, color: COLORS.ink, fontSize: 13, fontWeight: "700" }, input: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line, borderRadius: 11, width: 67, padding: 10, textAlign: "center", color: COLORS.ink, fontWeight: "700" }, inputDisabled: { opacity: 0.5 }, inputUnit: { width: 45, color: COLORS.muted, fontSize: 11, marginLeft: 8 }, soundRow: { flexDirection: "row", alignItems: "center", marginTop: 4, marginBottom: 17 }, saveButton: { backgroundColor: COLORS.purple, borderRadius: 15, padding: 15, alignItems: "center" }, saveDisabled: { opacity: 0.45 }, saveText: { color: "#FFF", fontWeight: "800" },
});
