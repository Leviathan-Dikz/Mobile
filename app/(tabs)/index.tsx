import { Ionicons } from "@expo/vector-icons";
import { Link, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  const db = useSQLiteContext();

  const [totalTasks, setTotalTasks] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);

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

        if (active) {
          setTotalTasks(total?.total ?? 0);
          setCompletedTasks(completed?.total ?? 0);
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
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.heading}>MyDay</Text>
          <Text style={styles.date}>{today}</Text>
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
        <Text style={styles.sectionTitle}>Today's Overview</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <Ionicons name="list-outline" size={22} color="#6C63FF" />
          </View>

          <Text style={styles.statNumber}>{totalTasks}</Text>
          <Text style={styles.statLabel}>Total Tasks</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: "#E5F8EF" }]}>
            <Ionicons
              name="checkmark-circle-outline"
              size={22}
              color="#22A06B"
            />
          </View>

          <Text style={styles.statNumber}>{completedTasks}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      {/* Progress */}
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.sectionTitle}>Daily Progress</Text>
          <Text style={styles.progressPercentage}>{progress}%</Text>
        </View>

        <View style={styles.progressBackground}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        <Text style={styles.progressSubtitle}>
          {completedTasks} of {totalTasks} tasks completed
        </Text>
      </View>

      {/* Tasks */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Tasks</Text>

        <Link href="/(tabs)/tasks" asChild>
          <Pressable>
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        </Link>
      </View>

      <View style={styles.emptyCard}>
        <View style={styles.emptyIcon}>
          <Ionicons name="clipboard-outline" size={35} color="#6C63FF" />
        </View>

        <Text style={styles.emptyTitle}>
          {totalTasks === 0 ? "No tasks yet" : "Your tasks are ready"}
        </Text>

        <Text style={styles.emptySubtitle}>
          {totalTasks === 0
            ? "Start organizing your day by adding your first task."
            : "Open your task list to manage your activities."}
        </Text>

        <Link href="/(tabs)/tasks" asChild>
          <Pressable style={styles.addButton}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>
              {totalTasks === 0 ? "Add New Task" : "View My Tasks"}
            </Text>
          </Pressable>
        </Link>
      </View>
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
