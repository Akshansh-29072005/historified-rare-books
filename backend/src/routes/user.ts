import { Hono } from 'hono'
import { Bindings, User } from '../types'
import { authMiddleware } from '../middleware/auth'

type Variables = {
  user: User
}

const user = new Hono<{ Bindings: Bindings, Variables: Variables }>()

user.use('*', authMiddleware)

user.get('/me', async (c) => {
  const currentUser = c.get('user')

  try {
    // Upsert user to ensure they exist in DB
    await c.env.DB.prepare(`
      INSERT INTO users (id, email, name, role, created_at)
      VALUES (?, ?, ?, ?, datetime("now"))
      ON CONFLICT(id) DO UPDATE SET
        email = excluded.email,
        name = excluded.name,
        role = excluded.role
    `).bind(currentUser.id, currentUser.email, currentUser.name, currentUser.role).run()

    const dbUser = await c.env.DB.prepare('SELECT id, email, name, role FROM users WHERE id = ?').bind(currentUser.id).first()
    
    return c.json(dbUser || currentUser)
  } catch (error) {
    return c.json({ error: 'Failed to fetch user', details: (error as Error).message }, 500)
  }
})

user.get('/purchases', async (c) => {
  const currentUser = c.get('user')

  try {
    const { results } = await c.env.DB.prepare(`
      SELECT b.id, b.title, b.author, b.cover_url, b.description, p.status as purchase_status, p.created_at as purchased_at
      FROM purchases p
      JOIN books b ON p.book_id = b.id
      WHERE p.user_id = ? AND p.status = 'COMPLETED'
      ORDER BY p.created_at DESC
    `).bind(currentUser.id).all()

    return c.json(results)
  } catch (error) {
    return c.json({ error: 'Failed to fetch purchases', details: (error as Error).message }, 500)
  }
})

export default user
