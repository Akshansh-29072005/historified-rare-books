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

    if (c.env.ADMIN_EMAIL && user.email.toLowerCase() === c.env.ADMIN_EMAIL.toLowerCase()) {
      user.role = 'admin'
    }

    c.set('user', user)
    await next()
  } catch (error) {
    return c.json({ error: 'Unauthorized', details: (error as Error).message }, 401)
  }
}
