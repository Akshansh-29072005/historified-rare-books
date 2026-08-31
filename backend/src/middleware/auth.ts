import { Context, Next } from 'hono'
import { Bindings, User } from '../types'

export async function authMiddleware(c: Context<{ Bindings: Bindings, Variables: { user: User } }>, next: Next) {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401)
  }

  const token = authHeader.split(' ')[1]
  if (!token) {
    return c.json({ error: 'Token missing' }, 401)
  }

  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format')
    }

    const payloadStr = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    const payload = JSON.parse(payloadStr)

    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) {
      throw new Error('Token expired')
    }

    if (!payload.iss || !payload.iss.startsWith('https://securetoken.google.com/')) {
      throw new Error('Invalid token issuer')
    }

    const user: User = {
      id: payload.sub,
      email: payload.email || '',
      name: payload.name || '',
      role: 'user'
    }

    const rawAdminEmails = c.env.ADMIN_EMAILS || c.env.ADMIN_EMAIL || ''
    const adminEmails = rawAdminEmails.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
    if (adminEmails.includes(user.email.toLowerCase().trim())) {
      user.role = 'admin'
    }

    // Automatically sync/upsert user record to D1 users table
    if (c.env.DB && user.id) {
      c.env.DB.prepare(`
        INSERT INTO users (id, email, name, role)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          email = excluded.email,
          name = excluded.name,
          role = excluded.role
      `).bind(user.id, user.email, user.name, user.role).run().catch(() => {})
    }

    c.set('user', user)
    await next()
  } catch (error) {
    return c.json({ error: 'Unauthorized', details: (error as Error).message }, 401)
  }
}
