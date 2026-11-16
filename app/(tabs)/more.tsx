import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/src/theme/ThemeContext";

export default function MoreScreen() {
  const { colors } = useAppTheme();
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>MAKE SPACE FOR WHAT MATTERS</Text>
        <Text style={[styles.title, { color: colors.text }]}>More</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Small tools for a steadier day.</Text>

        <Pressable style={styles.habitCard} onPress={() => router.push("/habits")}>
          <View style={styles.habitIcon}><Ionicons name="leaf-outline" size={26} color="#FFFFFF" /></View>
          <View style={styles.cardCopy}><Text style={styles.cardTitle}>Habit Tracker</Text><Text style={styles.cardSubtitle}>Build consistency, one check-in at a time.</Text></View>
          <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
        </Pressable>

        <Pressable style={[styles.pomodoroCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push("/pomodoro")}>
          <View style={[styles.pomodoroIcon, { backgroundColor: colors.primarySoft }]}><Ionicons name="timer-outline" size={26} color={colors.primary} /></View>
          <View style={styles.cardCopy}><Text style={[styles.pomodoroTitle, { color: colors.text }]}>Pomodoro</Text><Text style={[styles.pomodoroSubtitle, { color: colors.muted }]}>Kerjakan satu hal dalam blok waktu yang tenang.</Text></View>
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </Pressable>

        <Pressable style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push("/settings" as never)}>
          <View style={[styles.settingsIcon, { backgroundColor: colors.primarySoft }]}><Ionicons name="settings-outline" size={23} color={colors.primary} /></View>
          <View style={styles.cardCopy}><Text style={[styles.settingsTitle, { color: colors.text }]}>Settings</Text><Text style={[styles.settingsSubtitle, { color: colors.muted }]}>Theme, notifications, and preferences.</Text></View>
          <Ionicons name="chevron-forward" size={20} color="#85899B" />
        </Pressable>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>More to come</Text>
        <View style={[styles.comingCard, { backgroundColor: colors.card }]}><Ionicons name="sparkles-outline" size={20} color={colors.primary} /><Text style={[styles.comingText, { color: colors.muted }]}>Lebih banyak alat kecil untuk menjaga harimu tetap ringan.</Text></View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F7F8FC" },
  content: { padding: 22, paddingTop: 56, paddingBottom: 36 },
  eyebrow: { color: "#85899B", fontSize: 11, fontWeight: "700", letterSpacing: 1.1 },
  title: { color: "#20243A", fontSize: 32, fontWeight: "800", marginTop: 7 },
  subtitle: { color: "#85899B", fontSize: 13, marginTop: 6, marginBottom: 25 },
  habitCard: { backgroundColor: "#6C63FF", borderRadius: 22, padding: 18, flexDirection: "row", alignItems: "center" },
  pomodoroCard: { backgroundColor: "#FFFFFF", borderRadius: 22, padding: 18, flexDirection: "row", alignItems: "center", marginTop: 12, borderWidth: 1, borderColor: "#E8E9F1" },
  settingsCard: { backgroundColor: "#FFFFFF", borderRadius: 22, padding: 18, flexDirection: "row", alignItems: "center", marginTop: 12, borderWidth: 1, borderColor: "#E8E9F1" }, settingsIcon: { width: 50, height: 50, borderRadius: 17, backgroundColor: "#F0F0F4", alignItems: "center", justifyContent: "center" }, settingsTitle: { color: "#20243A", fontSize: 17, fontWeight: "800" }, settingsSubtitle: { color: "#85899B", fontSize: 12, lineHeight: 18, marginTop: 5 },
  pomodoroIcon: { width: 50, height: 50, borderRadius: 17, backgroundColor: "#EEECFF", alignItems: "center", justifyContent: "center" },
  pomodoroTitle: { color: "#20243A", fontSize: 17, fontWeight: "800" }, pomodoroSubtitle: { color: "#85899B", fontSize: 12, lineHeight: 18, marginTop: 5 },
  habitIcon: { width: 50, height: 50, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  cardCopy: { flex: 1, marginLeft: 14 }, cardTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "800" }, cardSubtitle: { color: "#E8E6FF", fontSize: 12, lineHeight: 18, marginTop: 5 },
  sectionTitle: { color: "#20243A", fontSize: 19, fontWeight: "800", marginTop: 30, marginBottom: 13 },
  comingCard: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 17, flexDirection: "row", alignItems: "center" }, comingText: { color: "#5F6273", fontSize: 13, marginLeft: 10, flex: 1 },
});
