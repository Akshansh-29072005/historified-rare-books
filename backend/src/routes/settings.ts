import { Hono } from 'hono'
import { Bindings, User } from '../types'
import { authMiddleware } from '../middleware/auth'
import { adminMiddleware } from '../middleware/admin'

type Variables = {
  user: User
}

const settings = new Hono<{ Bindings: Bindings, Variables: Variables }>()

settings.get('/', async (c) => {
  try {
    const results = await c.env.DB.prepare('SELECT key, value FROM settings').all()
    const config: Record<string, string> = {}
    
    if (results.results) {
      for (const row of results.results) {
        config[row.key as string] = row.value as string
      }
    }
    
    return c.json({ settings: config })
  } catch (error) {
    return c.json({ error: 'Failed to fetch settings', details: (error as Error).message }, 500)
  }
})

settings.post('/', authMiddleware, adminMiddleware, async (c) => {
  try {
    const body = await c.req.json()
    const updates = Object.entries(body)
    
    if (updates.length === 0) {
      return c.json({ message: 'No settings to update' })
    }

    const stmt = c.env.DB.prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP'
    )
    
    const batch = updates.map(([k, v]) => stmt.bind(k, String(v)))
    await c.env.DB.batch(batch)

    return c.json({ message: 'Settings updated successfully' })
  } catch (error) {
    return c.json({ error: 'Failed to update settings', details: (error as Error).message }, 500)
  }
})

export default settings
