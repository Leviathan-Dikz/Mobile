import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAppTheme } from "@/src/theme/ThemeContext";

type Note = {
  id: number;
  title: string;
  content: string | null;
  created_at: string | null;
  updated_at: string | null;
  pinned: number;
};

function formatNoteDate(value: string | null) {
  return value?.slice(0, 10) ?? "No date";
}

function previewNote(value: string | null) {
  return (value ?? "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export default function NotesScreen() {
  const db = useSQLiteContext();
  const { colors } = useAppTheme();
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchText, setSearchText] = useState("");

  const loadNotes = useCallback(async () => {
    const query = searchText.trim();
    const result = query
      ? await db.getAllAsync<Note>(
          "SELECT id, title, content, created_at, updated_at, pinned FROM notes WHERE title LIKE ? OR content LIKE ? ORDER BY pinned DESC, updated_at DESC, id DESC",
          `%${query}%`,
          `%${query}%`,
        )
      : await db.getAllAsync<Note>(
          "SELECT id, title, content, created_at, updated_at, pinned FROM notes ORDER BY pinned DESC, updated_at DESC, id DESC",
        );
    setNotes(result);
  }, [db, searchText]);

  useFocusEffect(
    useCallback(() => {
      loadNotes().catch(console.error);
    }, [loadNotes]),
  );

  function openEditor(id?: number) {
    router.push(id ? { pathname: "/note-editor", params: { id: String(id) } } : "/note-editor");
  }

  function deleteNote(note: Note) {
    Alert.alert("Hapus catatan", `Hapus "${note.title}"?`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          try {
            await db.runAsync("DELETE FROM notes WHERE id = ?", note.id);
            await loadNotes();
          } catch (error) {
            Alert.alert("Error", "Catatan tidak dapat dihapus.");
            console.error(error);
          }
        },
      },
    ]);
  }

  async function togglePin(note: Note) {
    try {
      await db.runAsync("UPDATE notes SET pinned = ? WHERE id = ?", note.pinned === 1 ? 0 : 1, note.id);
      await loadNotes();
    } catch (error) {
      Alert.alert("Error", "Status pin catatan tidak dapat diperbarui.");
      console.error(error);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={notes}
        keyExtractor={(note) => String(note.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.eyebrow}>YOUR THOUGHTS</Text>
                <Text style={[styles.title, { color: colors.text }]}>My Notes</Text>
                <Text style={[styles.subtitle, { color: colors.muted }]}>Keep the ideas worth returning to.</Text>
              </View>
              <Pressable style={styles.addButton} onPress={() => openEditor()} accessibilityLabel="Add note">
                <Ionicons name="add" size={24} color="#FFFFFF" />
              </Pressable>
            </View>
            <View style={[styles.searchBox, { backgroundColor: colors.card }]}>
              <Ionicons name="search-outline" size={19} color={colors.muted} />
              <TextInput
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Search title or content"
                placeholderTextColor={colors.muted}
                style={[styles.searchInput, { color: colors.text }]}
                returnKeyType="search"
              />
              {searchText ? (
                <Pressable onPress={() => setSearchText("")} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={colors.muted} />
                </Pressable>
              ) : null}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}><Ionicons name="document-text-outline" size={34} color={colors.primary} /></View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{searchText.trim() ? "No notes found" : "No notes yet"}</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>{searchText.trim() ? "Try another word or search phrase." : "Capture an idea before it drifts away."}</Text>
            {!searchText.trim() ? <Pressable style={styles.emptyButton} onPress={() => openEditor()}><Text style={styles.emptyButtonText}>Write a note</Text></Pressable> : null}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable style={[styles.noteCard, { backgroundColor: colors.card }]} onPress={() => openEditor(item.id)}>
            <View style={styles.noteCardHeader}>
              <Text style={[styles.noteDate, { color: colors.muted }]}>{formatNoteDate(item.updated_at ?? item.created_at)}</Text>
              <View style={styles.cardActions}>
                <Pressable onPress={() => { void togglePin(item); }} hitSlop={8} accessibilityLabel={item.pinned === 1 ? `Unpin ${item.title}` : `Pin ${item.title}`}>
                  <Ionicons name={item.pinned === 1 ? "pin" : "pin-outline"} size={18} color={item.pinned === 1 ? colors.primary : colors.muted} />
                </Pressable>
                <Pressable onPress={() => deleteNote(item)} hitSlop={8} accessibilityLabel={`Delete ${item.title}`}>
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </Pressable>
                <Ionicons name="chevron-forward" size={18} color={colors.primary} />
              </View>
            </View>
            <Text style={[styles.noteTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
            <Text style={[styles.noteContent, { color: colors.muted }]} numberOfLines={3}>{previewNote(item.content) || "Belum ada isi catatan"}</Text>
            <Text style={styles.editHint}>Open note</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FC" },
  listContent: { padding: 22, paddingTop: 56, paddingBottom: 35, flexGrow: 1 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 21 },
  eyebrow: { color: "#85899B", fontSize: 11, fontWeight: "700", letterSpacing: 1.2 },
  title: { color: "#20243A", fontSize: 30, fontWeight: "800", marginTop: 6 },
  subtitle: { color: "#85899B", fontSize: 13, marginTop: 6 },
  addButton: { width: 46, height: 46, borderRadius: 16, backgroundColor: "#6C63FF", alignItems: "center", justifyContent: "center" },
  searchBox: { height: 48, borderRadius: 15, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", paddingHorizontal: 14, marginBottom: 20 },
  searchInput: { flex: 1, color: "#20243A", fontSize: 14, marginLeft: 9, paddingVertical: 0 },
  noteCard: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 17, marginBottom: 12 },
  noteCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardActions: { flexDirection: "row", alignItems: "center", gap: 14 },
  noteDate: { color: "#85899B", fontSize: 11, fontWeight: "600" },
  noteTitle: { color: "#20243A", fontSize: 17, fontWeight: "800", marginTop: 15 },
  noteContent: { color: "#5F6273", fontSize: 13, lineHeight: 20, marginTop: 7 },
  editHint: { color: "#6C63FF", fontSize: 11, fontWeight: "700", marginTop: 14 },
  emptyState: { alignItems: "center", paddingHorizontal: 25, paddingVertical: 65 },
  emptyIcon: { width: 68, height: 68, borderRadius: 21, backgroundColor: "#EFEDFF", alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: "#20243A", fontSize: 17, fontWeight: "800", marginTop: 16 },
  emptyText: { color: "#85899B", fontSize: 13, lineHeight: 20, textAlign: "center", marginTop: 7 },
  emptyButton: { backgroundColor: "#6C63FF", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20, marginTop: 18 },
  emptyButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
});
