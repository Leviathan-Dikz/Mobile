import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAppTheme } from "@/src/theme/ThemeContext";
import { syncTaskWidgetSnapshot } from "@/src/widgets/taskWidget";

type Task = {
  id: number;
  title: string;
  description: string | null;
  scheduled_date: string | null;
  completed: number;
  created_at: string;
};

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const weekDays = ["M", "T", "W", "T", "F", "S", "S"];

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value: string | null) {
  if (!value) return new Date();
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getMonthDays(date: Date) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const mondayFirstOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return [
    ...Array.from({ length: mondayFirstOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
}

export default function TasksScreen() {
  const db = useSQLiteContext();
  const { colors, scheme } = useAppTheme();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskDescription, setTaskDescription] = useState("");
  const [scheduledDate, setScheduledDate] = useState<string | null>(null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  const loadTasks = useCallback(async () => {
    const result = await db.getAllAsync<Task>(
      "SELECT * FROM tasks ORDER BY id DESC",
    );
    setTasks(result);
    await syncTaskWidgetSnapshot(db).catch(console.error);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      loadTasks().catch(console.error);
    }, [loadTasks]),
  );

  function openAddModal() {
    setEditingTask(null);
    setTaskTitle("");
    setTaskDescription("");
    setScheduledDate(null);
    setModalVisible(true);
  }

  function openEditModal(task: Task) {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDescription(task.description ?? "");
    setScheduledDate(task.scheduled_date);
    setModalVisible(true);
  }

  async function saveTask() {
    const title = taskTitle.trim();
    const description = taskDescription.trim() || null;

    if (!title) {
      Alert.alert("Perhatian", "Nama tugas tidak boleh kosong.");
      return;
    }

    try {
      if (editingTask) {
        await db.runAsync(
          `UPDATE tasks
         SET title = ?, description = ?, scheduled_date = ?
         WHERE id = ?`,
          title,
          description,
          scheduledDate,
          editingTask.id,
        );
      } else {
        await db.runAsync(
          `INSERT INTO tasks (title, description, scheduled_date)
         VALUES (?, ?, ?)`,
          title,
          description,
          scheduledDate,
        );
      }

      setModalVisible(false);
      setTaskTitle("");
      setTaskDescription("");
      setScheduledDate(null);
      setEditingTask(null);

      await loadTasks();
    } catch (error) {
      Alert.alert("Error", "Gagal menyimpan tugas.");
      console.error(error);
    }
  }

  async function toggleTask(task: Task) {
    try {
      await db.runAsync(
        "UPDATE tasks SET completed = ? WHERE id = ?",
        task.completed === 1 ? 0 : 1,
        task.id,
      );

      await loadTasks();
    } catch (error) {
      Alert.alert("Error", "Gagal memperbarui tugas.");
      console.error(error);
    }
  }

  function deleteTask(task: Task) {
    Alert.alert(
      "Hapus Tugas",
      `Apakah kamu yakin ingin menghapus "${task.title}"?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            try {
              await db.runAsync("DELETE FROM tasks WHERE id = ?", task.id);
              await loadTasks();
            } catch (error) {
              Alert.alert("Error", "Gagal menghapus tugas.");
              console.error(error);
            }
          },
        },
      ],
    );
  }

  const completedCount = tasks.filter((task) => task.completed === 1).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.heading, { color: colors.text }]}>My Tasks</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Organize your day, one task at a time.
        </Text>
      </View>

      {/* Summary */}
      <View style={[styles.summary, { backgroundColor: colors.inverse }]}>
        <View>
          <Text style={[styles.summaryLabel, { color: colors.onInverse }]}>Your Progress</Text>
          <Text style={[styles.summaryNumber, { color: colors.onInverse }]}>
            {completedCount} / {tasks.length} completed
          </Text>
        </View>

        <View style={styles.summaryIcon}>
          <Ionicons name="checkmark-done-circle" size={30} color="#6C63FF" />
        </View>
      </View>

      {/* Task Header */}
      <View style={styles.listHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>All Tasks</Text>
        <Text style={[styles.taskCount, { color: colors.muted }]}>{tasks.length} tasks</Text>
      </View>

      {/* Task List */}
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="clipboard-outline" size={48} color="#B5B2D9" />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No tasks yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
              Add your first task to get started.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.taskCard, { backgroundColor: colors.card }]}>
            <Pressable style={styles.taskMain} onPress={() => toggleTask(item)}>
              <Ionicons
                name={
                  item.completed === 1 ? "checkmark-circle" : "ellipse-outline"
                }
                size={25}
                color={item.completed === 1 ? "#22A06B" : "#9295A5"}
              />

              <View style={styles.taskInfo}>
                <Text
                  style={[
                    styles.taskTitle,
                    { color: scheme === "dark" ? "#FFFFFF" : colors.text },
                    item.completed === 1 && styles.completedTitle,
                  ]}
                >
                  {item.title}
                </Text>
                <Text style={[styles.taskDescription, { color: colors.muted }]} numberOfLines={2}>
                  {item.description?.trim() || "Belum ada deskripsi"}
                </Text>
                {item.scheduled_date ? (
                  <Text style={[styles.taskDate, { color: colors.primary }]}>
                    Jadwal: {item.scheduled_date}
                  </Text>
                ) : null}
              </View>
            </Pressable>

            <View style={styles.actions}>
              <Pressable onPress={() => openEditModal(item)} hitSlop={8}>
                <Ionicons name="create-outline" size={21} color="#6C63FF" />
              </Pressable>

              <Pressable onPress={() => deleteTask(item)} hitSlop={8}>
                <Ionicons name="trash-outline" size={21} color="#E65B65" />
              </Pressable>
            </View>
          </View>
        )}
      />

      {/* Add Button */}
      <Pressable style={styles.addButton} onPress={openAddModal}>
        <Ionicons name="add" size={23} color="#FFFFFF" />
        <Text style={styles.addButtonText}>Add New Task</Text>
      </Pressable>

      {/* Add / Edit Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.48)" }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingTask ? "Edit Task" : "New Task"}
              </Text>

              <Pressable onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={25} color={colors.muted} />
              </Pressable>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Task Name</Text>

            <TextInput
              style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]}
              placeholder="What needs to be done?"
              placeholderTextColor={colors.muted}
              value={taskTitle}
              onChangeText={setTaskTitle}
              maxLength={120}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Description</Text>

            <TextInput
              style={[styles.input, styles.descriptionInput, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]}
              placeholder="Describe what you need to do..."
              placeholderTextColor={colors.muted}
              value={taskDescription}
              onChangeText={setTaskDescription}
              multiline
              textAlignVertical="top"
              maxLength={500}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Scheduled date</Text>
            <Pressable
              style={[styles.dateButton, { backgroundColor: colors.input, borderColor: colors.border }]}
              onPress={() => setDatePickerVisible(true)}
            >
              <Ionicons name="calendar-outline" size={19} color={colors.primary} />
              <Text style={[styles.dateButtonText, { color: colors.text }]}> 
                {scheduledDate ?? "Choose a date"}
              </Text>
              {scheduledDate ? (
                <Pressable onPress={() => setScheduledDate(null)} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={colors.muted} />
                </Pressable>
              ) : null}
            </Pressable>

            <Pressable style={styles.saveButton} onPress={saveTask}>
              <Text style={styles.saveButtonText}>
                {editingTask ? "Save Changes" : "Add Task"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={datePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDatePickerVisible(false)}
      >
        <SchedulePicker
          value={scheduledDate}
          onChange={(value) => {
            setScheduledDate(value);
            setDatePickerVisible(false);
          }}
          onClose={() => setDatePickerVisible(false)}
        />
      </Modal>
    </View>
  );
}

function SchedulePicker({
  value,
  onChange,
  onClose,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  onClose: () => void;
}) {
  const { colors } = useAppTheme();
  const initialMonth = parseLocalDate(value);
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1),
  );
  const days = useMemo(() => getMonthDays(visibleMonth), [visibleMonth]);
  const today = formatLocalDate(new Date());

  function moveMonth(offset: number) {
    setVisibleMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  }

  return (
    <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.55)" }]}>
      <View style={[styles.datePickerCard, { backgroundColor: colors.card }]}> 
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Choose a date</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={25} color={colors.muted} />
          </Pressable>
        </View>
        <View style={styles.monthHeader}>
          <Pressable onPress={() => moveMonth(-1)} hitSlop={10}>
            <Ionicons name="chevron-back" size={20} color={colors.primary} />
          </Pressable>
          <Text style={[styles.monthTitle, { color: colors.text }]}> 
            {monthNames[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
          </Text>
          <Pressable onPress={() => moveMonth(1)} hitSlop={10}>
            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          </Pressable>
        </View>
        <View style={styles.weekRow}>
          {weekDays.map((day, index) => (
            <Text key={`${day}-${index}`} style={[styles.weekDay, { color: colors.muted }]}>{day}</Text>
          ))}
        </View>
        <View style={styles.calendarGrid}>
          {days.map((day, index) => {
            if (!day) return <View key={`empty-${index}`} style={styles.calendarCell} />;
            const date = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day);
            const dateValue = formatLocalDate(date);
            const selected = value === dateValue;
            return (
              <Pressable
                key={dateValue}
                style={styles.calendarCell}
                onPress={() => onChange(dateValue)}
              >
                <View style={[styles.calendarDate, dateValue === today && styles.todayDate, selected && styles.selectedDate]}>
                  <Text style={[styles.calendarDateText, { color: colors.text }, dateValue === today && styles.todayDateText, selected && styles.selectedDateText]}>{day}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
        <Pressable style={styles.clearDateButton} onPress={() => onChange(null)}>
          <Text style={[styles.clearDateText, { color: colors.danger }]}>Clear scheduled date</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FC",
    paddingHorizontal: 22,
    paddingTop: 55,
  },
  header: {
    marginBottom: 25,
  },
  heading: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#20243A",
  },
  subtitle: {
    fontSize: 13,
    color: "#85899B",
    marginTop: 7,
  },
  summary: {
    backgroundColor: "#EFEDFF",
    borderRadius: 17,
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  summaryLabel: {
    color: "#FFFFFF",
    fontSize: 13,
  },
  summaryNumber: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 5,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  taskInfo: {
    flex: 1,
    gap: 5,
  },

  taskDescription: {
    fontSize: 12,
    color: "#85899B",
    lineHeight: 18,
  },
  taskDate: {
    fontSize: 11,
    color: "#6C63FF",
    marginTop: 3,
  },
  descriptionInput: {
    height: 110,
    paddingTop: 14,
    marginTop: 0,
  },
  dateButton: {
    minHeight: 48,
    backgroundColor: "#F7F8FC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E9E9F0",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 4,
  },
  dateButtonText: {
    flex: 1,
    color: "#555A6D",
    fontSize: 14,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#20243A",
  },
  taskCount: {
    fontSize: 13,
    color: "#85899B",
  },
  listContent: {
    paddingBottom: 15,
    flexGrow: 1,
  },
  taskCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  taskMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  taskTitle: {
    flex: 1,
    fontSize: 14,
    color: "#20243A",
    fontWeight: "500",
  },
  completedTitle: {
    textDecorationLine: "line-through",
    color: "#A0A3B1",
  },
  actions: {
    flexDirection: "row",
    gap: 17,
    marginLeft: 10,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 55,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#20243A",
    marginTop: 15,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#85899B",
    marginTop: 7,
  },
  addButton: {
    backgroundColor: "#6C63FF",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 22,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
  },
  datePickerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
  },
  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  monthTitle: {
    color: "#20243A",
    fontSize: 16,
    fontWeight: "700",
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 8,
  },
  weekDay: {
    width: "14.28%",
    textAlign: "center",
    color: "#85899B",
    fontSize: 12,
    fontWeight: "700",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarCell: {
    width: "14.28%",
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarDate: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarDateText: {
    color: "#20243A",
    fontSize: 13,
    fontWeight: "600",
  },
  todayDate: {
    borderWidth: 1,
    borderColor: "#6C63FF",
  },
  todayDateText: {
    color: "#6C63FF",
  },
  selectedDate: {
    backgroundColor: "#6C63FF",
    borderWidth: 0,
  },
  selectedDateText: {
    color: "#FFFFFF",
  },
  clearDateButton: {
    alignItems: "center",
    paddingTop: 15,
  },
  clearDateText: {
    color: "#E65B65",
    fontSize: 13,
    fontWeight: "700",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },
  modalTitle: {
    fontSize: 21,
    fontWeight: "bold",
    color: "#20243A",
  },
  inputLabel: {
    color: "#555A6D",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 9,
  },
  input: {
    backgroundColor: "#F7F8FC",
    borderRadius: 12,
    padding: 15,
    fontSize: 14,
    color: "#20243A",
    borderWidth: 1,
    borderColor: "#E9E9F0",
  },
  saveButton: {
    backgroundColor: "#6C63FF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 22,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 15,
  },
});
