import { Context, Next } from 'hono'
import { Bindings, User } from '../types'

export async function adminMiddleware(c: Context<{ Bindings: Bindings, Variables: { user: User } }>, next: Next) {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  // Support multiple admin emails (comma-separated or single)
  const rawAdminEmails = c.env.ADMIN_EMAILS || c.env.ADMIN_EMAIL || ''
  const adminEmails = rawAdminEmails.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

  if (!adminEmails.includes(user.email.toLowerCase().trim())) {
    return c.json({ error: 'Forbidden: Admin access required' }, 403)
  }

  await next()
}
