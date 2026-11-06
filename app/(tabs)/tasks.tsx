import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
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

type Task = {
  id: number;
  title: string;
  description: string | null;
  completed: number;
  created_at: string;
};

export default function TasksScreen() {
  const db = useSQLiteContext();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskDescription, setTaskDescription] = useState("");

  const loadTasks = useCallback(async () => {
    const result = await db.getAllAsync<Task>(
      "SELECT * FROM tasks ORDER BY id DESC",
    );
    setTasks(result);
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
    setModalVisible(true);
  }

  function openEditModal(task: Task) {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDescription(task.description ?? "");
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
         SET title = ?, description = ?
         WHERE id = ?`,
          title,
          description,
          editingTask.id,
        );
      } else {
        await db.runAsync(
          `INSERT INTO tasks (title, description)
         VALUES (?, ?)`,
          title,
          description,
        );
      }

      setModalVisible(false);
      setTaskTitle("");
      setTaskDescription("");
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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.heading}>My Tasks</Text>
        <Text style={styles.subtitle}>
          Organize your day, one task at a time.
        </Text>
      </View>

      {/* Summary */}
      <View style={styles.summary}>
        <View>
          <Text style={styles.summaryLabel}>Your Progress</Text>
          <Text style={styles.summaryNumber}>
            {completedCount} / {tasks.length} completed
          </Text>
        </View>

        <View style={styles.summaryIcon}>
          <Ionicons name="checkmark-done-circle" size={30} color="#6C63FF" />
        </View>
      </View>

      {/* Task Header */}
      <View style={styles.listHeader}>
        <Text style={styles.sectionTitle}>All Tasks</Text>
        <Text style={styles.taskCount}>{tasks.length} tasks</Text>
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
            <Text style={styles.emptyTitle}>No tasks yet</Text>
            <Text style={styles.emptySubtitle}>
              Add your first task to get started.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.taskCard}>
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
                    item.completed === 1 && styles.completedTitle,
                  ]}
                >
                  {item.title}
                </Text>
                <Text style={styles.taskDescription} numberOfLines={2}>
                  {item.description?.trim() || "Belum ada deskripsi"}
                </Text>
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingTask ? "Edit Task" : "New Task"}
              </Text>

              <Pressable onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={25} color="#777E90" />
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>Task Name</Text>

            <TextInput
              style={styles.input}
              placeholder="What needs to be done?"
              placeholderTextColor="#A0A3B1"
              value={taskTitle}
              onChangeText={setTaskTitle}
              maxLength={120}
            />

            <Text style={styles.inputLabel}>Description</Text>

            <TextInput
              style={[styles.input, styles.descriptionInput]}
              placeholder="Describe what you need to do..."
              placeholderTextColor="#A0A3B1"
              value={taskDescription}
              onChangeText={setTaskDescription}
              multiline
              textAlignVertical="top"
              maxLength={500}
            />

            <Pressable style={styles.saveButton} onPress={saveTask}>
              <Text style={styles.saveButtonText}>
                {editingTask ? "Save Changes" : "Add Task"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
    color: "#777E90",
    fontSize: 13,
  },
  summaryNumber: {
    color: "#20243A",
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
  descriptionInput: {
    height: 110,
    paddingTop: 14,
    marginTop: 0,
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
