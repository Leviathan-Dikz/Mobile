import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useMemo, useState } from "react";
import { Alert, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useAppTheme } from "@/src/theme/ThemeContext";

type HabitRow = {
  id: number;
  title: string;
  description: string | null;
  frequency: string | null;
  scheduled_days: string | null;
  start_date: string | null;
  is_active: number;
};

type HabitLog = { habit_id: number; completed_date: string };
type Habit = HabitRow & { scheduledDays: number[]; completedToday: boolean; streak: number; logDates: Set<string> };
type FormState = { title: string; description: string; frequency: "daily" | "custom"; scheduledDays: number[]; startDate: string; isActive: boolean };

const weekDays = ["M", "T", "W", "T", "F", "S", "S"];

function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function mondayDay(date: Date) {
  return ((date.getDay() + 6) % 7) + 1;
}

function parseScheduledDays(value: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((day): day is number => typeof day === "number" && day >= 1 && day <= 7) : [];
  } catch {
    return [];
  }
}

function isScheduled(habit: Pick<HabitRow, "frequency" | "scheduled_days" | "start_date">, date: Date) {
  if (habit.start_date && localDate(date) < habit.start_date) return false;
  if (habit.frequency !== "custom") return true;
  return parseScheduledDays(habit.scheduled_days).includes(mondayDay(date));
}

function calculateStreak(habit: HabitRow, logs: Set<string>) {
  let cursor = new Date();
  if (isScheduled(habit, cursor) && !logs.has(localDate(cursor))) cursor = addDays(cursor, -1);
  let streak = 0;
  for (let index = 0; index < 370; index += 1) {
    if (habit.start_date && localDate(cursor) < habit.start_date) break;
    if (isScheduled(habit, cursor)) {
      if (!logs.has(localDate(cursor))) break;
      streak += 1;
    }
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function defaultForm(): FormState {
  return { title: "", description: "", frequency: "daily", scheduledDays: [1, 2, 3, 4, 5, 6, 7], startDate: localDate(), isActive: true };
}

export default function HabitsScreen() {
  const db = useSQLiteContext();
  const { colors } = useAppTheme();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);
  const today = localDate();

  const loadHabits = useCallback(async () => {
    const rows = await db.getAllAsync<HabitRow>("SELECT id, title, description, frequency, scheduled_days, start_date, is_active FROM habits WHERE is_active = 1 ORDER BY id DESC");
    const logs = await db.getAllAsync<HabitLog>("SELECT habit_id, completed_date FROM habit_logs ORDER BY completed_date DESC");
    const grouped = new Map<number, Set<string>>();
    logs.forEach((log) => {
      const dates = grouped.get(log.habit_id) ?? new Set<string>();
      dates.add(log.completed_date);
      grouped.set(log.habit_id, dates);
    });
    setHabits(rows.map((habit) => {
      const logDates = grouped.get(habit.id) ?? new Set<string>();
      return { ...habit, scheduledDays: parseScheduledDays(habit.scheduled_days), completedToday: logDates.has(today), streak: calculateStreak(habit, logDates), logDates };
    }));
  }, [db, today]);

  useFocusEffect(useCallback(() => { loadHabits().catch(console.error); }, [loadHabits]));

  const completedToday = habits.filter((habit) => habit.completedToday).length;
  const activeCount = habits.length;
  const lastSevenDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(new Date(), index - 6)), []);

  function openNew() { setEditingHabit(null); setForm(defaultForm()); setModalVisible(true); }

  function openEdit(habit: Habit) {
    setEditingHabit(habit);
    setForm({ title: habit.title, description: habit.description ?? "", frequency: habit.frequency === "custom" ? "custom" : "daily", scheduledDays: habit.scheduledDays.length ? habit.scheduledDays : [1, 2, 3, 4, 5, 6, 7], startDate: habit.start_date ?? today, isActive: habit.is_active === 1 });
    setModalVisible(true);
  }

  async function saveHabit() {
    const title = form.title.trim();
    const startDate = form.startDate.trim();
    if (!title) return Alert.alert("Perhatian", "Nama habit wajib diisi.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return Alert.alert("Perhatian", "Tanggal mulai harus berformat YYYY-MM-DD.");
    if (form.frequency === "custom" && form.scheduledDays.length === 0) return Alert.alert("Perhatian", "Pilih setidaknya satu hari.");
    const scheduledDays = form.frequency === "custom" ? JSON.stringify(form.scheduledDays) : null;
    try {
      if (editingHabit) {
        await db.runAsync("UPDATE habits SET title = ?, description = ?, frequency = ?, scheduled_days = ?, start_date = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", title, form.description.trim() || null, form.frequency, scheduledDays, startDate, form.isActive ? 1 : 0, editingHabit.id);
      } else {
        await db.runAsync("INSERT INTO habits (title, description, frequency, scheduled_days, start_date, is_active, updated_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)", title, form.description.trim() || null, form.frequency, scheduledDays, startDate, form.isActive ? 1 : 0);
      }
      setModalVisible(false);
      await loadHabits();
    } catch (error) {
      Alert.alert("Error", "Habit tidak dapat disimpan.");
      console.error(error);
    }
  }

  async function toggleToday(habit: Habit) {
    if (!isScheduled(habit, new Date())) return Alert.alert("Belum terjadwal", "Habit ini tidak dijadwalkan untuk hari ini.");
    try {
      if (habit.completedToday) await db.runAsync("DELETE FROM habit_logs WHERE habit_id = ? AND completed_date = ?", habit.id, today);
      else await db.runAsync("INSERT OR IGNORE INTO habit_logs (habit_id, completed_date) VALUES (?, ?)", habit.id, today);
      await loadHabits();
    } catch (error) {
      Alert.alert("Error", "Check-in habit gagal diperbarui.");
      console.error(error);
    }
  }

  async function deactivate(habit: Habit) {
    Alert.alert("Nonaktifkan habit", `Sembunyikan "${habit.title}" dari daftar aktif? Riwayat tetap disimpan.`, [
      { text: "Batal", style: "cancel" },
      { text: "Nonaktifkan", style: "destructive", onPress: () => { void (async () => { try { await db.runAsync("UPDATE habits SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?", habit.id); await loadHabits(); } catch (error) { Alert.alert("Error", "Habit tidak dapat dinonaktifkan."); console.error(error); } })(); } },
    ]);
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}><View><Text style={styles.eyebrow}>YOUR ROUTINES</Text><Text style={[styles.title, { color: colors.text }]}>My Habits</Text><Text style={[styles.subtitle, { color: colors.muted }]}>Consistency grows from small returns.</Text></View><Pressable style={styles.addButton} onPress={openNew}><Ionicons name="add" size={24} color="#FFFFFF" /></Pressable></View>
        <View style={styles.summaryCard}><View><Text style={styles.summaryLabel}>TODAY'S RHYTHM</Text><Text style={styles.summaryValue}>{completedToday} of {activeCount} checked in</Text></View><View style={styles.summaryRing}><Text style={styles.summaryPercent}>{activeCount ? Math.round((completedToday / activeCount) * 100) : 0}%</Text></View></View>
        <View style={styles.sectionRow}><Text style={[styles.sectionTitle, { color: colors.text }]}>Active habits</Text><Text style={[styles.count, { color: colors.muted }]}>{activeCount}</Text></View>

        {habits.length ? habits.map((habit) => (
          <View key={habit.id} style={[styles.habitItem, { backgroundColor: colors.card }]}>
            <View style={styles.habitItemTop}><View style={styles.leaf}><Ionicons name="leaf-outline" size={19} color={colors.primary} /></View><View style={styles.habitCopy}><Text style={[styles.habitTitle, { color: colors.text }]}>{habit.title}</Text><Text style={[styles.habitDescription, { color: colors.muted }]}>{habit.description?.trim() || (habit.frequency === "custom" ? `${habit.scheduledDays.length} days a week` : "Every day")}</Text></View><Pressable onPress={() => openEdit(habit)} hitSlop={8}><Ionicons name="create-outline" size={20} color={colors.primary} /></Pressable><Pressable onPress={() => deactivate(habit)} hitSlop={8} style={styles.deleteButton}><Ionicons name="archive-outline" size={20} color={colors.danger} /></Pressable></View>
            <View style={styles.habitMeta}><View style={styles.daysRow}>{lastSevenDays.map((date) => { const dateKey = localDate(date); const done = habit.logDates.has(dateKey); const scheduled = isScheduled(habit, date); return <View key={dateKey} style={[styles.dayDot, done && styles.dayDotDone, !scheduled && styles.dayDotOff]}><Text style={[styles.dayDotText, done && styles.dayDotTextDone]}>{date.getDate()}</Text></View>; })}</View><Text style={[styles.streak, { color: colors.muted }]}><Ionicons name="flame-outline" size={14} color="#EF9B75" /> {habit.streak} day streak</Text></View>
            <Pressable style={[styles.checkinButton, { borderColor: colors.primary }, habit.completedToday && styles.checkinDone]} onPress={() => toggleToday(habit)}><Ionicons name={habit.completedToday ? "checkmark-circle" : "ellipse-outline"} size={20} color={habit.completedToday ? "#FFFFFF" : colors.primary} /><Text style={[styles.checkinText, { color: colors.primary }, habit.completedToday && styles.checkinTextDone]}>{habit.completedToday ? "Completed today" : "Mark complete"}</Text></Pressable>
          </View>
        )) : <View style={[styles.emptyCard, { backgroundColor: colors.card }]}><View style={styles.emptyIcon}><Ionicons name="leaf-outline" size={32} color={colors.primary} /></View><Text style={[styles.emptyTitle, { color: colors.text }]}>No habits yet</Text><Text style={[styles.emptyText, { color: colors.muted }]}>Choose one small thing you want to return to.</Text><Pressable style={styles.emptyButton} onPress={openNew}><Text style={styles.emptyButtonText}>Create a habit</Text></Pressable></View>}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}><View style={[styles.modalContent, { backgroundColor: colors.card }]}><View style={styles.modalHeader}><Text style={[styles.modalTitle, { color: colors.text }]}>{editingHabit ? "Edit habit" : "New habit"}</Text><Pressable onPress={() => setModalVisible(false)} hitSlop={8}><Ionicons name="close" size={25} color={colors.muted} /></Pressable></View>
          <Text style={[styles.inputLabel, { color: colors.text }]}>Name</Text><TextInput style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]} value={form.title} onChangeText={(value) => setForm((current) => ({ ...current, title: value }))} placeholder="e.g. Read 10 pages" placeholderTextColor={colors.muted} maxLength={100} />
          <Text style={[styles.inputLabel, { color: colors.text }]}>Description</Text><TextInput style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]} value={form.description} onChangeText={(value) => setForm((current) => ({ ...current, description: value }))} placeholder="Optional" placeholderTextColor={colors.muted} maxLength={180} />
          <Text style={[styles.inputLabel, { color: colors.text }]}>Frequency</Text><View style={styles.frequencyRow}><Pressable style={[styles.frequencyButton, { borderColor: colors.border }, form.frequency === "daily" && styles.frequencyActive]} onPress={() => setForm((current) => ({ ...current, frequency: "daily" }))}><Text style={[styles.frequencyText, { color: colors.muted }, form.frequency === "daily" && styles.frequencyTextActive]}>Every day</Text></Pressable><Pressable style={[styles.frequencyButton, { borderColor: colors.border }, form.frequency === "custom" && styles.frequencyActive]} onPress={() => setForm((current) => ({ ...current, frequency: "custom" }))}><Text style={[styles.frequencyText, { color: colors.muted }, form.frequency === "custom" && styles.frequencyTextActive]}>Selected days</Text></Pressable></View>
          {form.frequency === "custom" ? <View style={styles.selectDays}>{weekDays.map((day, index) => { const dayNumber = index + 1; const selected = form.scheduledDays.includes(dayNumber); return <Pressable key={`${day}-${index}`} style={[styles.dayButton, { backgroundColor: colors.input }, selected && styles.dayButtonActive]} onPress={() => setForm((current) => ({ ...current, scheduledDays: selected ? current.scheduledDays.filter((item) => item !== dayNumber) : [...current.scheduledDays, dayNumber].sort() }))}><Text style={[styles.dayButtonText, { color: colors.muted }, selected && styles.dayButtonTextActive]}>{day}</Text></Pressable>; })}</View> : null}
          <Text style={[styles.inputLabel, { color: colors.text }]}>Start date (YYYY-MM-DD)</Text><TextInput style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]} value={form.startDate} onChangeText={(value) => setForm((current) => ({ ...current, startDate: value }))} placeholder={today} placeholderTextColor={colors.muted} maxLength={10} />
          {editingHabit ? <View style={styles.switchRow}><Text style={[styles.switchText, { color: colors.text }]}>Active habit</Text><Switch value={form.isActive} onValueChange={(value) => setForm((current) => ({ ...current, isActive: value }))} trackColor={{ false: colors.border, true: colors.primarySoft }} thumbColor={form.isActive ? colors.primary : colors.muted} /></View> : null}
          <Pressable style={styles.saveButton} onPress={() => { void saveHabit(); }}><Text style={styles.saveButtonText}>{editingHabit ? "Save changes" : "Create habit"}</Text></Pressable>
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F7F8FC" }, content: { padding: 22, paddingTop: 56, paddingBottom: 36 }, headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }, eyebrow: { color: "#85899B", fontSize: 11, fontWeight: "700", letterSpacing: 1.2 }, title: { color: "#20243A", fontSize: 32, fontWeight: "800", marginTop: 7 }, subtitle: { color: "#85899B", fontSize: 13, marginTop: 6 }, addButton: { width: 46, height: 46, borderRadius: 16, backgroundColor: "#6C63FF", alignItems: "center", justifyContent: "center" },
  summaryCard: { backgroundColor: "#20243A", borderRadius: 22, padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }, summaryLabel: { color: "#AEB0C2", fontSize: 10, fontWeight: "800", letterSpacing: 1 }, summaryValue: { color: "#FFFFFF", fontSize: 20, fontWeight: "800", marginTop: 8 }, summaryRing: { width: 62, height: 62, borderRadius: 31, borderWidth: 5, borderColor: "#6C63FF", alignItems: "center", justifyContent: "center" }, summaryPercent: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" }, sectionRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 }, sectionTitle: { color: "#20243A", fontSize: 19, fontWeight: "800" }, count: { color: "#85899B", fontSize: 13, marginLeft: 8 },
  habitItem: { backgroundColor: "#FFFFFF", borderRadius: 19, padding: 16, marginBottom: 12 }, habitItemTop: { flexDirection: "row", alignItems: "center" }, leaf: { width: 40, height: 40, borderRadius: 13, backgroundColor: "#EFEDFF", alignItems: "center", justifyContent: "center" }, habitCopy: { flex: 1, marginLeft: 12 }, habitTitle: { color: "#20243A", fontSize: 15, fontWeight: "800" }, habitDescription: { color: "#85899B", fontSize: 12, marginTop: 4 }, deleteButton: { marginLeft: 15 }, habitMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16 }, daysRow: { flexDirection: "row", gap: 5 }, dayDot: { width: 25, height: 25, borderRadius: 8, backgroundColor: "#E5F5EF", alignItems: "center", justifyContent: "center" }, dayDotDone: { backgroundColor: "#5FB39B" }, dayDotOff: { backgroundColor: "#F0F0F4" }, dayDotText: { color: "#4E8E7C", fontSize: 10, fontWeight: "700" }, dayDotTextDone: { color: "#FFFFFF" }, streak: { color: "#85899B", fontSize: 11, fontWeight: "700" }, checkinButton: { height: 42, borderRadius: 12, borderWidth: 1, borderColor: "#DCD9FF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 15 }, checkinDone: { backgroundColor: "#6C63FF", borderColor: "#6C63FF" }, checkinText: { color: "#6C63FF", fontSize: 13, fontWeight: "800" }, checkinTextDone: { color: "#FFFFFF" },
  emptyCard: { backgroundColor: "#FFFFFF", borderRadius: 19, alignItems: "center", padding: 28 }, emptyIcon: { width: 66, height: 66, borderRadius: 21, backgroundColor: "#EFEDFF", alignItems: "center", justifyContent: "center" }, emptyTitle: { color: "#20243A", fontSize: 17, fontWeight: "800", marginTop: 15 }, emptyText: { color: "#85899B", fontSize: 13, textAlign: "center", marginTop: 7 }, emptyButton: { backgroundColor: "#6C63FF", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20, marginTop: 18 }, emptyButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }, modalContent: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 30 }, modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 17 }, modalTitle: { color: "#20243A", fontSize: 21, fontWeight: "800" }, inputLabel: { color: "#555A6D", fontSize: 13, fontWeight: "700", marginBottom: 7, marginTop: 8 }, input: { backgroundColor: "#F7F8FC", borderRadius: 12, borderWidth: 1, borderColor: "#E9E9F0", padding: 13, color: "#20243A", fontSize: 14 }, frequencyRow: { flexDirection: "row", gap: 9 }, frequencyButton: { flex: 1, borderRadius: 11, borderWidth: 1, borderColor: "#E3E3EC", padding: 12, alignItems: "center" }, frequencyActive: { backgroundColor: "#EFEDFF", borderColor: "#6C63FF" }, frequencyText: { color: "#85899B", fontSize: 13, fontWeight: "700" }, frequencyTextActive: { color: "#6C63FF" }, selectDays: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 }, dayButton: { width: 36, height: 36, borderRadius: 11, backgroundColor: "#F0F0F4", alignItems: "center", justifyContent: "center" }, dayButtonActive: { backgroundColor: "#6C63FF" }, dayButtonText: { color: "#85899B", fontSize: 12, fontWeight: "800" }, dayButtonTextActive: { color: "#FFFFFF" }, switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14 }, switchText: { color: "#20243A", fontSize: 14, fontWeight: "700" }, saveButton: { backgroundColor: "#6C63FF", borderRadius: 12, alignItems: "center", padding: 16, marginTop: 21 }, saveButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
});
