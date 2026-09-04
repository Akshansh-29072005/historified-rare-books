import { Context, Next } from 'hono'
import { Bindings, User } from '../types'

export async function authMiddleware(c: Context<{ Bindings: Bindings, Variables: { user: User } }>, next: Next) {
  let token = c.req.query('token')
  
  if (!token) {
    const authHeader = c.req.header('Authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1]
    }
  }

  if (!token) {
    return c.json({ error: 'Missing or invalid token' }, 401)
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

    // Note: User record sync happens only in GET /user/me, not on every request

    c.set('user', user)
    await next()
  } catch (error) {
    return c.json({ error: 'Unauthorized', details: (error as Error).message }, 401)
  }
}
