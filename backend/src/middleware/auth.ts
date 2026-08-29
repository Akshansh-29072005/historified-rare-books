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
    // Basic JWT decoding without signature verification for now
    // TODO: Implement full RSA signature verification using Web Crypto API and Google public keys
    const parts = token.split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format')
    }

    const payloadStr = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    const payload = JSON.parse(payloadStr)

    const projectId = c.env.FIREBASE_PROJECT_ID
    
    if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
      throw new Error('Invalid issuer')
    }
    if (payload.aud !== projectId) {
      throw new Error('Invalid audience')
    }
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp < now) {
      throw new Error('Token expired')
    }

    const user: User = {
      id: payload.sub,
      email: payload.email || '',
      name: payload.name || '',
      role: 'user' // Default role
    }

    // Set admin role if matches ADMIN_EMAIL
    if (user.email === c.env.ADMIN_EMAIL) {
      user.role = 'admin'
    }

    c.set('user', user)
    await next()
  } catch (error) {
    return c.json({ error: 'Unauthorized', details: (error as Error).message }, 401)
  }
}
