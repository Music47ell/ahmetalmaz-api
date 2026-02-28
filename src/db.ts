import { Database } from 'bun:sqlite'

const DB_PATH = process.env.DATABASE_PATH || './app.db'

export const db = new Database(DB_PATH, { create: true })

db.exec('PRAGMA journal_mode = WAL')
db.exec('PRAGMA synchronous = NORMAL')
db.exec('PRAGMA foreign_keys = ON')

const schema = await Bun.file(`${import.meta.dir}/schema.sql`).text()
db.exec(schema)
