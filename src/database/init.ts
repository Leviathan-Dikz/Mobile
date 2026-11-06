
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
      completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
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

  console.log('MyDay database initialized!');
}
