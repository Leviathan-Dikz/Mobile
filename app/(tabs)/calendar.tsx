import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/src/theme/ThemeContext";
import { syncTaskWidgetSnapshot } from "@/src/widgets/taskWidget";

type CalendarTask = {
  id: number;
  title: string;
  description: string | null;
  completed: number;
  scheduled_date: string | null;
};

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const mondayWeekDays = ["M", "T", "W", "T", "F", "S", "S"];
const sundayWeekDays = ["S", "M", "T", "W", "T", "F", "S"];

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthDays(date: Date, weekStart: "monday" | "sunday") {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstOffset = weekStart === "monday" ? (firstDay.getDay() + 6) % 7 : firstDay.getDay();
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return [...Array.from({ length: firstOffset }, () => null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
}

export default function CalendarScreen() {
  const db = useSQLiteContext();
  const { weekStart, colors } = useAppTheme();
  const today = formatLocalDate(new Date());
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const current = new Date();
    return new Date(current.getFullYear(), current.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(today);
  const [monthTasks, setMonthTasks] = useState<CalendarTask[]>([]);
  const monthKey = `${visibleMonth.getFullYear()}-${String(visibleMonth.getMonth() + 1).padStart(2, "0")}`;
  const days = useMemo(() => getMonthDays(visibleMonth, weekStart), [visibleMonth, weekStart]);
  const weekDays = weekStart === "monday" ? mondayWeekDays : sundayWeekDays;
  const selectedTasks = monthTasks.filter((task) => task.scheduled_date === selectedDate);
  const scheduledDates = useMemo(() => new Set(monthTasks.map((task) => task.scheduled_date).filter(Boolean)), [monthTasks]);

  const loadMonthTasks = useCallback(async () => {
    const result = await db.getAllAsync<CalendarTask>(
      "SELECT id, title, description, completed, scheduled_date FROM tasks WHERE scheduled_date LIKE ? ORDER BY completed ASC, id DESC",
      `${monthKey}%`,
    );
    setMonthTasks(result);
  }, [db, monthKey]);

  useFocusEffect(useCallback(() => { loadMonthTasks().catch(console.error); }, [loadMonthTasks]));

  function moveMonth(offset: number) {
    const next = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1);
    setVisibleMonth(next);
    setSelectedDate(formatLocalDate(next));
  }

  async function toggleTask(task: CalendarTask) {
    try {
      await db.runAsync("UPDATE tasks SET completed = ? WHERE id = ?", task.completed === 1 ? 0 : 1, task.id);
      await loadMonthTasks();
      await syncTaskWidgetSnapshot(db);
    } catch (error) {
      Alert.alert("Error", "Gagal memperbarui tugas.");
      console.error(error);
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>YOUR SCHEDULE</Text>
        <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]}>Calendar</Text>
          <View style={styles.monthControls}>
            <Pressable onPress={() => moveMonth(-1)} style={[styles.controlButton, { backgroundColor: colors.primarySoft }]} hitSlop={8}><Ionicons name="chevron-back" size={19} color={colors.primary} /></Pressable>
            <Pressable onPress={() => moveMonth(1)} style={[styles.controlButton, { backgroundColor: colors.primarySoft }]} hitSlop={8}><Ionicons name="chevron-forward" size={19} color={colors.primary} /></Pressable>
          </View>
        </View>

        <View style={[styles.calendarCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.monthTitle, { color: colors.text }]}>{monthNames[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}</Text>
          <View style={styles.weekRow}>{weekDays.map((day, index) => <Text key={`${day}-${index}`} style={[styles.weekDay, { color: colors.muted }]}>{day}</Text>)}</View>
          <View style={styles.calendarGrid}>
            {days.map((day, index) => {
              if (!day) return <View key={`empty-${index}`} style={styles.calendarCell} />;
              const dateValue = formatLocalDate(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day));
              const selected = dateValue === selectedDate;
              const isToday = dateValue === today;
              const hasTask = scheduledDates.has(dateValue);
              return (
                <Pressable key={dateValue} style={styles.calendarCell} onPress={() => setSelectedDate(dateValue)}>
                  <View style={[styles.calendarDate, isToday && styles.todayDate, selected && styles.selectedDate]}>
                    <Text style={[styles.calendarDateText, { color: colors.text }, isToday && styles.todayDateText, selected && styles.selectedDateText]}>{day}</Text>
                    {hasTask ? <View style={[styles.taskDot, selected && styles.selectedTaskDot]} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.agendaHeader}>
          <View><Text style={[styles.sectionTitle, { color: colors.text }]}>Agenda</Text><Text style={[styles.selectedLabel, { color: colors.muted }]}>{selectedDate}</Text></View>
          <Text style={[styles.eventCount, { color: colors.muted }]}>{selectedTasks.length} {selectedTasks.length === 1 ? "task" : "tasks"}</Text>
        </View>

        {selectedTasks.length ? selectedTasks.map((task) => (
          <Pressable key={task.id} style={[styles.taskCard, { backgroundColor: colors.card }]} onPress={() => toggleTask(task)}>
            <Ionicons name={task.completed === 1 ? "checkmark-circle" : "ellipse-outline"} size={25} color={task.completed === 1 ? colors.success : colors.muted} />
            <View style={styles.taskCopy}>
              <Text style={[styles.taskTitle, { color: colors.text }, task.completed === 1 && styles.completedTitle]}>{task.title}</Text>
              <Text style={[styles.taskDescription, { color: colors.muted }]} numberOfLines={2}>{task.description?.trim() || "Belum ada deskripsi"}</Text>
            </View>
          </Pressable>
        )) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.card }]}><Ionicons name="sunny-outline" size={30} color={colors.primary} /><Text style={[styles.emptyTitle, { color: colors.text }]}>Nothing scheduled</Text><Text style={[styles.emptyText, { color: colors.muted }]}>A little room in the day can be a good thing.</Text></View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F7F8FC" }, content: { padding: 22, paddingBottom: 36 },
  eyebrow: { color: "#85899B", fontSize: 11, fontWeight: "700", letterSpacing: 1.2 }, headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 7, marginBottom: 22 }, title: { color: "#20243A", fontSize: 32, fontWeight: "800" },
  monthControls: { flexDirection: "row", gap: 8 }, controlButton: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#EFEDFF", alignItems: "center", justifyContent: "center" }, calendarCard: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 17, marginBottom: 28 }, monthTitle: { color: "#20243A", fontSize: 17, fontWeight: "800", marginBottom: 18 },
  weekRow: { flexDirection: "row", justifyContent: "space-around", marginBottom: 8 }, weekDay: { width: "14.28%", textAlign: "center", color: "#85899B", fontSize: 12, fontWeight: "700" }, calendarGrid: { flexDirection: "row", flexWrap: "wrap" }, calendarCell: { width: "14.28%", height: 44, alignItems: "center", justifyContent: "center" }, calendarDate: { width: 36, height: 36, borderRadius: 13, alignItems: "center", justifyContent: "center" }, calendarDateText: { color: "#20243A", fontSize: 13, fontWeight: "600" },
  todayDate: { borderWidth: 1, borderColor: "#6C63FF" }, todayDateText: { color: "#6C63FF" }, selectedDate: { backgroundColor: "#6C63FF", borderWidth: 0 }, selectedDateText: { color: "#FFFFFF" }, taskDot: { position: "absolute", bottom: 3, width: 4, height: 4, borderRadius: 2, backgroundColor: "#6C63FF" }, selectedTaskDot: { backgroundColor: "#FFFFFF" },
  agendaHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }, sectionTitle: { color: "#20243A", fontSize: 19, fontWeight: "800" }, selectedLabel: { color: "#85899B", fontSize: 12, marginTop: 4 }, eventCount: { color: "#85899B", fontSize: 13 }, taskCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, marginBottom: 10, flexDirection: "row", alignItems: "center" }, taskCopy: { flex: 1, marginLeft: 12 }, taskTitle: { color: "#20243A", fontSize: 15, fontWeight: "700" }, completedTitle: { color: "#A0A3B1", textDecorationLine: "line-through" }, taskDescription: { color: "#85899B", fontSize: 12, lineHeight: 18, marginTop: 4 }, emptyCard: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 25, alignItems: "center" }, emptyTitle: { color: "#20243A", fontSize: 16, fontWeight: "800", marginTop: 12 }, emptyText: { color: "#85899B", fontSize: 13, marginTop: 6, textAlign: "center" },
});
