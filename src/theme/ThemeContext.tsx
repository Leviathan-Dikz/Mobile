import { useSQLiteContext } from "expo-sqlite";
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, ColorSchemeName } from "react-native";

export type ThemePreference = "light" | "dark" | "system";
export type WeekStart = "monday" | "sunday";
export type AppColors = { background: string; card: string; text: string; muted: string; border: string; primary: string; primarySoft: string; input: string; success: string; danger: string; inverse: string; inverseMuted: string; onInverse: string };

const palettes: Record<"light" | "dark", AppColors> = {
  light: { background: "#F7F8FC", card: "#FFFFFF", text: "#20243A", muted: "#85899B", border: "#E8E9F1", primary: "#6C63FF", primarySoft: "#EEECFF", input: "#F7F8FC", success: "#22A06B", danger: "#E65B65", inverse: "#292D47", inverseMuted: "#B7BAD0", onInverse: "#FFFFFF" },
  dark: { background: "#111321", card: "#1C2032", text: "#F5F6FF", muted: "#A8ACC1", border: "#30354D", primary: "#9A93FF", primarySoft: "#302D5D", input: "#252A3D", success: "#63D5A4", danger: "#FF858D", inverse: "#252A3D", inverseMuted: "#A8ACC1", onInverse: "#FFFFFF" },
};

type ThemeContextValue = { preference: ThemePreference; scheme: "light" | "dark"; colors: AppColors; weekStart: WeekStart; pomodoroNotifications: boolean; pomodoroSound: boolean; setPreference: (value: ThemePreference) => Promise<void>; setWeekStart: (value: WeekStart) => Promise<void>; setPomodoroNotifications: (value: boolean) => Promise<void>; setPomodoroSound: (value: boolean) => Promise<void> };
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function AppThemeProvider({ children }: PropsWithChildren) {
  const db = useSQLiteContext();
  const systemScheme = Appearance.getColorScheme() ?? "light";
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [weekStart, setWeekStartState] = useState<WeekStart>("monday");
  const [pomodoroNotifications, setPomodoroNotificationsState] = useState(true);
  const [pomodoroSound, setPomodoroSoundState] = useState(true);
  const [currentSystem, setCurrentSystem] = useState<ColorSchemeName>(systemScheme);

  useEffect(() => { const subscription = Appearance.addChangeListener(({ colorScheme }) => setCurrentSystem(colorScheme ?? "light")); return () => subscription.remove(); }, []);
  useEffect(() => { void (async () => { const rows = await db.getAllAsync<{ key: string; value: string }>("SELECT key, value FROM app_settings"); const values = Object.fromEntries(rows.map((row) => [row.key, row.value])); if (values.theme === "light" || values.theme === "dark" || values.theme === "system") setPreferenceState(values.theme); if (values.week_start === "sunday" || values.week_start === "monday") setWeekStartState(values.week_start); const pomodoro = await db.getFirstAsync<{ sound_enabled: number; notifications_enabled: number }>("SELECT sound_enabled, notifications_enabled FROM pomodoro_settings WHERE id = 1"); if (pomodoro) { setPomodoroSoundState(pomodoro.sound_enabled === 1); setPomodoroNotificationsState(pomodoro.notifications_enabled === 1); } })().catch(console.error); }, [db]);

  const scheme = preference === "system" ? (currentSystem === "dark" ? "dark" : "light") : preference;
  const value = useMemo<ThemeContextValue>(() => ({ preference, scheme, colors: palettes[scheme], weekStart, pomodoroNotifications, pomodoroSound, setPreference: async (next) => { setPreferenceState(next); await db.runAsync("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('theme', ?)", next); }, setWeekStart: async (next) => { setWeekStartState(next); await db.runAsync("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('week_start', ?)", next); }, setPomodoroNotifications: async (next) => { setPomodoroNotificationsState(next); await db.runAsync("UPDATE pomodoro_settings SET notifications_enabled = ? WHERE id = 1", next ? 1 : 0); }, setPomodoroSound: async (next) => { setPomodoroSoundState(next); await db.runAsync("UPDATE pomodoro_settings SET sound_enabled = ? WHERE id = 1", next ? 1 : 0); } }), [db, pomodoroNotifications, pomodoroSound, preference, scheme, weekStart]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() { const context = useContext(ThemeContext); if (!context) throw new Error("useAppTheme must be used inside AppThemeProvider"); return context; }
