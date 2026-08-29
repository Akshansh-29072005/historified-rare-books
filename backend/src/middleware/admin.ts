import { Context, Next } from 'hono'
import { Bindings, User } from '../types'

export async function adminMiddleware(c: Context<{ Bindings: Bindings, Variables: { user: User } }>, next: Next) {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  if (user.email !== c.env.ADMIN_EMAIL) {
    return c.json({ error: 'Forbidden: Admin access required' }, 403)
  }

  await next()
}
