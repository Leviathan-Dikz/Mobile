import * as FileSystem from "expo-file-system/legacy";
import type * as SQLite from "expo-sqlite";

type WidgetTask = {
  title: string;
  completed: number;
  scheduled_date: string | null;
};

function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export async function syncTaskWidgetSnapshot(db: SQLite.SQLiteDatabase) {
  if (!FileSystem.documentDirectory) return;
  const date = localDate();
  const tasks = await db.getAllAsync<WidgetTask>(
    "SELECT title, completed, scheduled_date FROM tasks WHERE scheduled_date = ? OR scheduled_date IS NULL ORDER BY CASE WHEN scheduled_date = ? THEN 0 ELSE 1 END, completed ASC, id DESC LIMIT 5",
    date,
    date,
  );
  const pending = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM tasks WHERE completed = 0 AND (scheduled_date = ? OR scheduled_date IS NULL)",
    date,
  );
  const payload = JSON.stringify({ date, pendingCount: pending?.count ?? 0, tasks });
  await FileSystem.writeAsStringAsync(`${FileSystem.documentDirectory}task-widget.json`, payload);
}
