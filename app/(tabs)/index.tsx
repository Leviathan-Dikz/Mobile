import { Ionicons } from "@expo/vector-icons";
import { Link, router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/src/theme/ThemeContext";
import { syncTaskWidgetSnapshot } from "@/src/widgets/taskWidget";

type HomeTask = {
  id: number;
  title: string;
  description: string | null;
  scheduled_date: string | null;
  completed: number;
};

export default function HomeScreen() {
  const db = useSQLiteContext();
  const { colors } = useAppTheme();

  const [totalTasks, setTotalTasks] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [homeTasks, setHomeTasks] = useState<HomeTask[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadTasks() {
        const total = await db.getFirstAsync<{ total: number }>(
          "SELECT COUNT(*) AS total FROM tasks",
        );

        const completed = await db.getFirstAsync<{ total: number }>(
          "SELECT COUNT(*) AS total FROM tasks WHERE completed = 1",
        );

        const latestTasks = await db.getAllAsync<HomeTask>(
          "SELECT id, title, description, scheduled_date, completed FROM tasks ORDER BY completed ASC, id DESC LIMIT 5",
        );

        if (active) {
          setTotalTasks(total?.total ?? 0);
          setCompletedTasks(completed?.total ?? 0);
          setHomeTasks(latestTasks);
          await syncTaskWidgetSnapshot(db).catch(console.error);
        }
      }

      loadTasks().catch(console.error);

      return () => {
        active = false;
      };
    }, [db]),
  );

  const progress =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const hour = new Date().getHours();

  const greeting =
    hour < 11
      ? "Good morning 👋"
      : hour < 15
        ? "Good afternoon 👋"
        : hour < 18
          ? "Good evening 👋"
          : "Good night 👋";

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.muted }]}>{greeting}</Text>
          <Text style={[styles.heading, { color: colors.text }]}>MyDay</Text>
          <Text style={[styles.date, { color: colors.muted }]}>{today}</Text>
        </View>

        <View style={styles.avatar}>
          <Ionicons name="person" size={22} color="#FFFFFF" />
        </View>
      </View>

      {/* Welcome Card */}
      <View style={styles.welcomeCard}>
        <View style={styles.welcomeContent}>
          <Text style={styles.welcomeTitle}>Make today count!</Text>
          <Text style={styles.welcomeSubtitle}>Small steps, big progress.</Text>
        </View>

        <Ionicons name="sunny-outline" size={55} color="#FFFFFF" />
      </View>

      {/* Overview */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Today's Overview</Text>
      </View>

      <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <View style={styles.statIcon}>
            <Ionicons name="list-outline" size={22} color="#6C63FF" />
          </View>

          <Text style={[styles.statNumber, { color: colors.text }]}>{totalTasks}</Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Total Tasks</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <View style={[styles.statIcon, { backgroundColor: "#E5F8EF" }]}>
            <Ionicons
              name="checkmark-circle-outline"
              size={22}
              color="#22A06B"
            />
          </View>

          <Text style={[styles.statNumber, { color: colors.text }]}>{completedTasks}</Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Completed</Text>
        </View>
      </View>

      {/* Progress */}
      <View style={[styles.progressCard, { backgroundColor: colors.card }]}>
        <View style={styles.progressHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Daily Progress</Text>
          <Text style={[styles.progressPercentage, { color: colors.primary }]}>{progress}%</Text>
        </View>

        <View style={styles.progressBackground}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        <Text style={[styles.progressSubtitle, { color: colors.muted }]}>
          {completedTasks} of {totalTasks} tasks completed
        </Text>
      </View>

      {/* Tasks */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>My Tasks</Text>

        <Link href="/(tabs)/tasks" asChild>
          <Pressable>
            <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
          </Pressable>
        </Link>
      </View>

      {homeTasks.length > 0 ? (
        <View style={[styles.taskList, { backgroundColor: colors.card }]}> 
          {homeTasks.map((task) => (
            <Pressable key={task.id} style={[styles.homeTaskRow, { borderBottomColor: colors.border }]} onPress={() => router.push("/(tabs)/tasks")} accessibilityRole="button" accessibilityLabel={`Open task ${task.title}`}>
              <Ionicons name={task.completed === 1 ? "checkmark-circle" : "ellipse-outline"} size={24} color={task.completed === 1 ? colors.success : colors.muted} />
              <View style={styles.homeTaskCopy}>
                <Text style={[styles.homeTaskTitle, { color: colors.text }, task.completed === 1 && styles.homeTaskCompleted]} numberOfLines={1}>{task.title}</Text>
                <Text style={[styles.homeTaskMeta, { color: colors.muted }]} numberOfLines={1}>{task.scheduled_date ? `Jadwal: ${task.scheduled_date}` : task.description?.trim() || "Belum ada jadwal"}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          ))}
          <Link href="/(tabs)/tasks" asChild><Pressable style={styles.viewTasksButton}><Text style={[styles.viewTasksText, { color: colors.primary }]}>Lihat semua task</Text><Ionicons name="arrow-forward" size={16} color={colors.primary} /></Pressable></Link>
        </View>
      ) : (
        <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
          <View style={styles.emptyIcon}><Ionicons name="clipboard-outline" size={35} color="#6C63FF" /></View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No tasks yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>Start organizing your day by adding your first task.</Text>
          <Link href="/(tabs)/tasks" asChild><Pressable style={styles.addButton}><Ionicons name="add" size={20} color="#FFFFFF" /><Text style={styles.addButtonText}>Add New Task</Text></Pressable></Link>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FC",
  },
  content: {
    padding: 22,
    paddingTop: 55,
    paddingBottom: 35,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },
  greeting: {
    fontSize: 14,
    color: "#85899B",
  },
  heading: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#20243A",
    marginTop: 3,
  },
  date: {
    fontSize: 13,
    color: "#85899B",
    marginTop: 5,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#6C63FF",
    justifyContent: "center",
    alignItems: "center",
  },
  welcomeCard: {
    backgroundColor: "#6C63FF",
    borderRadius: 20,
    padding: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  welcomeContent: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 21,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: "#E5E3FF",
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#20243A",
  },
  statsContainer: {
    flexDirection: "row",
    gap: 13,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 17,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EFEDFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#20243A",
  },
  statLabel: {
    fontSize: 12,
    color: "#85899B",
    marginTop: 4,
  },
  progressCard: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 17,
    marginBottom: 28,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  progressPercentage: {
    color: "#6C63FF",
    fontWeight: "bold",
    fontSize: 16,
  },
  progressBackground: {
    height: 9,
    borderRadius: 10,
    backgroundColor: "#ECEBFA",
    overflow: "hidden",
  },
  progressFill: {
    height: 9,
    borderRadius: 10,
    backgroundColor: "#6C63FF",
  },
  progressSubtitle: {
    color: "#85899B",
    fontSize: 12,
    marginTop: 12,
  },
  seeAll: {
    color: "#6C63FF",
    fontSize: 13,
    fontWeight: "600",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 23,
    alignItems: "center",
  },
  taskList: {
    borderRadius: 18,
    paddingHorizontal: 16,
    overflow: "hidden",
  },
  homeTaskRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  homeTaskCopy: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  homeTaskTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  homeTaskCompleted: {
    textDecorationLine: "line-through",
    opacity: 0.55,
  },
  homeTaskMeta: {
    fontSize: 11,
    marginTop: 4,
  },
  viewTasksButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  viewTasksText: {
    fontSize: 12,
    fontWeight: "800",
  },
  emptyIcon: {
    width: 65,
    height: 65,
    borderRadius: 20,
    backgroundColor: "#EFEDFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#20243A",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#85899B",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6C63FF",
    paddingVertical: 13,
    paddingHorizontal: 22,
    borderRadius: 12,
    marginTop: 18,
    gap: 7,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
