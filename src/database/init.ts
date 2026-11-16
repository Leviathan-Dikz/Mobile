
import * as SQLite from 'expo-sqlite';

export async function initializeDatabase(
  db: SQLite.SQLiteDatabase
) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      scheduled_date TEXT,
      completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      pinned INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      frequency TEXT NOT NULL DEFAULT 'daily',
      scheduled_days TEXT,
      start_date TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS habit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id INTEGER NOT NULL,
      completed_date TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(habit_id, completed_date)
    );

    CREATE TABLE IF NOT EXISTS pomodoro_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at TEXT NOT NULL,
      completed_at TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      local_date TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS pomodoro_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      focus_minutes INTEGER NOT NULL DEFAULT 25,
      short_break_minutes INTEGER NOT NULL DEFAULT 5,
      long_break_minutes INTEGER NOT NULL DEFAULT 15,
      long_break_interval INTEGER NOT NULL DEFAULT 4,
      sound_enabled INTEGER NOT NULL DEFAULT 1,
      notifications_enabled INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    INSERT OR IGNORE INTO pomodoro_settings (id) VALUES (1);
    INSERT OR IGNORE INTO app_settings (key, value) VALUES ('theme', 'system');
    INSERT OR IGNORE INTO app_settings (key, value) VALUES ('week_start', 'monday');
  `);

  const columns = await db.getAllAsync<{ name: string }>(
    'PRAGMA table_info(tasks)',
  );

  const hasDescription = columns.some(
    (column) => column.name === 'description',
  );

  if (!hasDescription) {
    await db.execAsync('ALTER TABLE tasks ADD COLUMN description TEXT');
  }

  const hasScheduledDate = columns.some(
    (column) => column.name === 'scheduled_date',
  );

  if (!hasScheduledDate) {
    await db.execAsync('ALTER TABLE tasks ADD COLUMN scheduled_date TEXT');
  }

  const noteColumns = await db.getAllAsync<{ name: string }>(
    'PRAGMA table_info(notes)',
  );

  const hasContent = noteColumns.some((column) => column.name === 'content');
  if (!hasContent) {
    await db.execAsync("ALTER TABLE notes ADD COLUMN content TEXT NOT NULL DEFAULT ''");
  }

  const hasUpdatedAt = noteColumns.some((column) => column.name === 'updated_at');
  if (!hasUpdatedAt) {
    await db.execAsync('ALTER TABLE notes ADD COLUMN updated_at TEXT');
    await db.execAsync('UPDATE notes SET updated_at = COALESCE(created_at, CURRENT_TIMESTAMP) WHERE updated_at IS NULL');
  }

  const hasPinned = noteColumns.some((column) => column.name === 'pinned');
  if (!hasPinned) {
    await db.execAsync('ALTER TABLE notes ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0');
  }

  const habitColumns = await db.getAllAsync<{ name: string }>(
    'PRAGMA table_info(habits)',
  );
  const habitColumnNames = new Set(habitColumns.map((column) => column.name));

  if (!habitColumnNames.has('description')) {
    await db.execAsync('ALTER TABLE habits ADD COLUMN description TEXT');
  }
  if (!habitColumnNames.has('frequency')) {
    await db.execAsync("ALTER TABLE habits ADD COLUMN frequency TEXT NOT NULL DEFAULT 'daily'");
  }
  if (!habitColumnNames.has('scheduled_days')) {
    await db.execAsync('ALTER TABLE habits ADD COLUMN scheduled_days TEXT');
  }
  if (!habitColumnNames.has('start_date')) {
    await db.execAsync('ALTER TABLE habits ADD COLUMN start_date TEXT');
  }
  if (!habitColumnNames.has('is_active')) {
    await db.execAsync('ALTER TABLE habits ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1');
  }
  if (!habitColumnNames.has('updated_at')) {
    await db.execAsync('ALTER TABLE habits ADD COLUMN updated_at TEXT');
  }

  const localToday = new Date();
  const today = `${localToday.getFullYear()}-${String(localToday.getMonth() + 1).padStart(2, '0')}-${String(localToday.getDate()).padStart(2, '0')}`;
  await db.runAsync(
    "UPDATE habits SET frequency = COALESCE(frequency, 'daily'), start_date = COALESCE(start_date, ?), is_active = COALESCE(is_active, 1), updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP) WHERE start_date IS NULL OR frequency IS NULL OR is_active IS NULL OR updated_at IS NULL",
    today,
  );

  await db.execAsync(
    'CREATE UNIQUE INDEX IF NOT EXISTS habit_logs_unique_date ON habit_logs (habit_id, completed_date)',
  );

  const pomodoroColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(pomodoro_settings)');
  if (!pomodoroColumns.some((column) => column.name === 'notifications_enabled')) {
    await db.execAsync('ALTER TABLE pomodoro_settings ADD COLUMN notifications_enabled INTEGER NOT NULL DEFAULT 1');
  }

  console.log('MyDay database initialized!');
}
