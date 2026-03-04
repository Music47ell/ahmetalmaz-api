import { createClient } from '@libsql/client'

if (!process.env.TURSO_DATABASE_URL)
	throw new Error('TURSO_DATABASE_URL is required')

export const db = createClient({
	url: process.env.TURSO_DATABASE_URL,
	authToken: process.env.TURSO_AUTH_TOKEN,
})

const schema = await Bun.file(`${import.meta.dir}/schema.sql`).text()
for (const sql of schema
	.split(';')
	.map((s) => s.trim())
	.filter(Boolean)) {
	await db.execute(sql)
}
