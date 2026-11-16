import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import {
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { AppColors, useAppTheme } from "@/src/theme/ThemeContext";

const RichTextWebView = WebView as unknown as ComponentType<any>;

type WebViewHandle = {
  injectJavaScript: (script: string) => void;
};

type Note = {
  id: number;
  title: string;
  content: string | null;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function toEditorHtml(value: string | null) {
  if (!value) return "<p><br></p>";
  if (/<\/?(p|div|br|strong|em|u|ul|ol|li|span)\b/i.test(value)) return value;
  return value
    .split(/\r?\n/)
    .map((line) => `<p>${escapeHtml(line) || "<br>"}</p>`)
    .join("");
}

function buildEditorHtml(initialHtml: string, colors: AppColors) {
  const safeInitialHtml = JSON.stringify(initialHtml).replace(/</g, "\\u003c");
  return `<!doctype html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: ${colors.background}; color: ${colors.text}; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
  body { padding: 12px 22px 28px; font-size: 17px; line-height: 1.65; }
  #editor { min-height: 100%; outline: none; }
  p { margin: 0 0 12px; }
  ul, ol { padding-left: 25px; }
  li { padding-left: 3px; margin-bottom: 5px; }
  blockquote { border-left: 3px solid ${colors.primary}; margin: 14px 0; padding-left: 13px; color: ${colors.muted}; }
  img { max-width: 100%; height: auto; border-radius: 12px; display: block; margin: 10px 0; }
</style></head>
<body><div id="editor" contenteditable="true" spellcheck="true"></div>
<script>
  const editor = document.getElementById('editor');
  editor.innerHTML = ${safeInitialHtml};
  window.sendFormatState = function() {
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'state',
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      list: document.queryCommandState('insertUnorderedList')
    }));
  };
  function sendChange() {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'change', html: editor.innerHTML }));
    window.sendFormatState();
  }
  editor.addEventListener('input', sendChange);
  editor.addEventListener('focus', () => { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'focus' })); window.sendFormatState(); });
  document.addEventListener('selectionchange', window.sendFormatState);
  editor.addEventListener('keyup', window.sendFormatState);
  editor.addEventListener('mouseup', window.sendFormatState);
  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
  window.sendFormatState();
</script></body></html>`;
}

export default function NoteEditorScreen() {
  const db = useSQLiteContext();
  const { colors } = useAppTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const noteId = Array.isArray(id) ? id[0] : id;
  const webViewRef = useRef<WebViewHandle | null>(null);
  const [title, setTitle] = useState("");
  const [htmlContent, setHtmlContent] = useState("<p><br></p>");
  const [savedTitle, setSavedTitle] = useState("");
  const [savedHtmlContent, setSavedHtmlContent] = useState("<p><br></p>");
  const [initialHtml, setInitialHtml] = useState("<p><br></p>");
  const [loaded, setLoaded] = useState(!noteId);
  const [bodyFocused, setBodyFocused] = useState(false);
  const [formatState, setFormatState] = useState({ bold: false, italic: false, underline: false, list: false });
  const editorSource = useMemo(() => ({ html: buildEditorHtml(initialHtml, colors) }), [initialHtml]);

  useEffect(() => {
    const theme = JSON.stringify({ background: colors.background, text: colors.text, muted: colors.muted, primary: colors.primary });
    webViewRef.current?.injectJavaScript(`(() => { const theme = ${theme}; document.documentElement.style.background = theme.background; document.body.style.background = theme.background; document.body.style.color = theme.text; const quote = document.querySelectorAll('blockquote'); quote.forEach((item) => { item.style.borderLeftColor = theme.primary; item.style.color = theme.muted; }); })(); true;`);
  }, [colors]);

  const dirty = title !== savedTitle || htmlContent !== savedHtmlContent;

  useEffect(() => {
    if (!noteId) return;
    let active = true;
    db.getFirstAsync<Note>("SELECT id, title, content FROM notes WHERE id = ?", Number(noteId))
      .then((note) => {
        if (!active) return;
        if (!note) {
          Alert.alert("Catatan tidak ditemukan", "Catatan ini mungkin sudah dihapus.", [{ text: "OK", onPress: () => router.back() }]);
          return;
        }
        const content = toEditorHtml(note.content);
        setTitle(note.title);
        setSavedTitle(note.title);
        setHtmlContent(content);
        setSavedHtmlContent(content);
        setInitialHtml(content);
        setLoaded(true);
      })
      .catch((error) => {
        console.error(error);
        Alert.alert("Error", "Catatan tidak dapat dibuka.", [{ text: "OK", onPress: () => router.back() }]);
      });
    return () => { active = false; };
  }, [db, noteId]);

  function runCommand(command: string, value?: string) {
    const serializedValue = value ? JSON.stringify(value) : "null";
    webViewRef.current?.injectJavaScript(`document.execCommand(${JSON.stringify(command)}, false, ${serializedValue}); window.sendFormatState && window.sendFormatState(); true;`);
  }

  async function insertImage() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Izin diperlukan", "Izinkan akses galeri untuk memasukkan foto.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.85,
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      if (!FileSystem.documentDirectory) throw new Error("Penyimpanan aplikasi tidak tersedia.");
      const extension = (asset.fileName?.split(".").pop() || "jpg").replace(/[^a-z0-9]/gi, "");
      const destination = `${FileSystem.documentDirectory}note-image-${Date.now()}.${extension}`;
      await FileSystem.copyAsync({ from: asset.uri, to: destination });
      runCommand("insertHTML", `<p><img src="${destination}" alt="Note image" /></p>`);
    } catch (error) {
      Alert.alert("Error", "Foto tidak dapat dimasukkan.");
      console.error(error);
    }
  }

  function handleMessage(event: { nativeEvent: { data: string } }) {
    try {
      const message = JSON.parse(event.nativeEvent.data) as { type?: string; html?: string };
      if (message.type === "change" && typeof message.html === "string") setHtmlContent(message.html);
      if (message.type === "focus") setBodyFocused(true);
      if (message.type === "state") {
        setFormatState({
          bold: Boolean((message as { bold?: boolean }).bold),
          italic: Boolean((message as { italic?: boolean }).italic),
          underline: Boolean((message as { underline?: boolean }).underline),
          list: Boolean((message as { list?: boolean }).list),
        });
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function saveAndExit() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert("Perhatian", "Judul catatan wajib diisi.");
      return;
    }
    try {
      if (noteId) {
        await db.runAsync("UPDATE notes SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", trimmedTitle, htmlContent, Number(noteId));
      } else {
        await db.runAsync("INSERT INTO notes (title, content, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)", trimmedTitle, htmlContent);
      }
      setSavedTitle(trimmedTitle);
      setSavedHtmlContent(htmlContent);
      router.back();
    } catch (error) {
      Alert.alert("Error", "Catatan tidak dapat disimpan.");
      console.error(error);
    }
  }

  function handleBack() {
    if (!dirty) {
      router.back();
      return;
    }
    Alert.alert("Perubahan belum disimpan", "Simpan perubahan sebelum keluar?", [
      { text: "Batal", style: "cancel" },
      { text: "Buang", style: "destructive", onPress: () => router.back() },
      { text: "Simpan", onPress: () => { void saveAndExit(); } },
    ]);
  }

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      handleBack();
      return true;
    });
    return () => subscription.remove();
  });

  if (!loaded) return <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} />;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.editor} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Pressable onPress={handleBack} style={styles.headerButton} hitSlop={8} accessibilityLabel="Go back"><Ionicons name="arrow-back" size={23} color={colors.text} /></Pressable>
          <View style={styles.headerActions}>
            <Pressable onPress={() => runCommand("undo")} style={styles.headerButton} hitSlop={8} accessibilityLabel="Undo"><Ionicons name="arrow-undo-outline" size={21} color={colors.primary} /></Pressable>
            <Pressable onPress={() => runCommand("redo")} style={styles.headerButton} hitSlop={8} accessibilityLabel="Redo"><Ionicons name="arrow-redo-outline" size={21} color={colors.primary} /></Pressable>
            <Pressable onPress={() => { void saveAndExit(); }} style={styles.doneButton} hitSlop={5} accessibilityLabel="Save note"><Ionicons name="checkmark" size={22} color="#FFFFFF" /></Pressable>
          </View>
        </View>

        <Text style={[styles.fieldLabel, { color: colors.muted }]}>TITLE</Text>
        <TextInput style={[styles.titleInput, { color: colors.text }]} value={title} onFocus={() => setBodyFocused(false)} onChangeText={setTitle} placeholder="Note title" placeholderTextColor={colors.muted} maxLength={120} returnKeyType="next" />
        <Text style={[styles.fieldLabel, { color: colors.muted }]}>NOTE</Text>
        <RichTextWebView
          ref={webViewRef}
          style={[styles.webView, { backgroundColor: colors.background }]}
          originWhitelist={["*"]}
          source={editorSource}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
          allowFileAccess
          allowUniversalAccessFromFileURLs
          hideKeyboardAccessoryView={false}
          keyboardDisplayRequiresUserAction={false}
        />

        <View style={[styles.toolbar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <Text style={[styles.toolbarLabel, { color: colors.muted }]}>FORMAT</Text>
          <View style={[styles.toolbarDivider, { backgroundColor: colors.border }]} />
          <Pressable disabled={!bodyFocused} style={[styles.toolButton, { backgroundColor: colors.primarySoft }, !bodyFocused && [styles.toolButtonDisabled, { backgroundColor: colors.input }], formatState.bold && styles.toolButtonActive]} onPress={() => runCommand("bold")} accessibilityLabel="Bold"><Text style={[styles.boldIcon, { color: bodyFocused ? colors.text : colors.muted }, formatState.bold && styles.activeIcon]}>B</Text></Pressable>
          <Pressable disabled={!bodyFocused} style={[styles.toolButton, { backgroundColor: colors.primarySoft }, !bodyFocused && [styles.toolButtonDisabled, { backgroundColor: colors.input }], formatState.italic && styles.toolButtonActive]} onPress={() => runCommand("italic")} accessibilityLabel="Italic"><Text style={[styles.italicIcon, { color: bodyFocused ? colors.text : colors.muted }, formatState.italic && styles.activeIcon]}>It</Text></Pressable>
          <Pressable disabled={!bodyFocused} style={[styles.toolButton, { backgroundColor: colors.primarySoft }, !bodyFocused && [styles.toolButtonDisabled, { backgroundColor: colors.input }], formatState.underline && styles.toolButtonActive]} onPress={() => runCommand("underline")} accessibilityLabel="Underline"><Text style={[styles.underlineIcon, { color: bodyFocused ? colors.text : colors.muted }, formatState.underline && styles.activeIcon]}>U</Text></Pressable>
          <Pressable disabled={!bodyFocused} style={[styles.toolButton, { backgroundColor: colors.primarySoft }, !bodyFocused && [styles.toolButtonDisabled, { backgroundColor: colors.input }], formatState.list && styles.toolButtonActive]} onPress={() => runCommand("insertUnorderedList")} accessibilityLabel="Bullet list"><Ionicons name="list-outline" size={22} color={!bodyFocused ? colors.muted : formatState.list ? "#FFFFFF" : colors.text} /></Pressable>
          <Pressable disabled={!bodyFocused} style={[styles.toolButton, { backgroundColor: colors.primarySoft }, !bodyFocused && [styles.toolButtonDisabled, { backgroundColor: colors.input }]]} onPress={() => runCommand("insertText", "☐ ")} accessibilityLabel="Checklist"><Ionicons name="checkbox-outline" size={21} color={bodyFocused ? colors.text : colors.muted} /></Pressable>
          <Pressable disabled={!bodyFocused} style={[styles.toolButton, { backgroundColor: colors.primarySoft }, !bodyFocused && [styles.toolButtonDisabled, { backgroundColor: colors.input }]]} onPress={() => { void insertImage(); }} accessibilityLabel="Insert photo"><Ionicons name="image-outline" size={21} color={bodyFocused ? colors.text : colors.muted} /></Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F7F8FC" }, editor: { flex: 1 },
  header: { minHeight: 82, paddingHorizontal: 18, paddingTop: Platform.OS === "android" ? 18 : 8, paddingBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#E9E9F0", backgroundColor: "#FFFFFF" },
  headerButton: { width: 38, height: 38, alignItems: "center", justifyContent: "center" }, headerActions: { flexDirection: "row", alignItems: "center", gap: 7 }, doneButton: { width: 38, height: 38, borderRadius: 13, backgroundColor: "#6C63FF", alignItems: "center", justifyContent: "center", marginLeft: 5 },
  fieldLabel: { color: "#85899B", fontSize: 10, fontWeight: "800", letterSpacing: 1.2, paddingHorizontal: 22, paddingTop: 15 },
  titleInput: { color: "#20243A", fontSize: 26, fontWeight: "800", paddingHorizontal: 22, paddingTop: 5, paddingBottom: 10 }, webView: { flex: 1, backgroundColor: "#F7F8FC" },
  toolbar: { minHeight: 78, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 16, flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#E9E9F0", gap: 8 }, toolbarLabel: { color: "#85899B", fontSize: 10, fontWeight: "800", letterSpacing: 1 }, toolbarDivider: { width: 1, height: 22, backgroundColor: "#E1E1E9", marginHorizontal: 4 }, toolButton: { width: 38, height: 38, borderRadius: 11, backgroundColor: "#EFEDFF", alignItems: "center", justifyContent: "center" }, toolButtonDisabled: { backgroundColor: "#F3F3F7" }, toolButtonActive: { backgroundColor: "#6C63FF" }, disabledIcon: { color: "#B8BAC5" }, activeIcon: { color: "#FFFFFF" }, boldIcon: { color: "#20243A", fontSize: 19, fontWeight: "900" }, italicIcon: { color: "#20243A", fontSize: 17, fontStyle: "italic", fontWeight: "900" }, underlineIcon: { color: "#20243A", fontSize: 19, textDecorationLine: "underline", fontWeight: "700" },
});
