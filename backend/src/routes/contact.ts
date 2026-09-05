import { Hono } from 'hono'
import { Bindings } from '../types'
import { authMiddleware } from '../middleware/auth'
import { adminMiddleware } from '../middleware/admin'
import { sendBrevoEmail, getAdminSupportNotificationHtml } from '../lib/email'

const contact = new Hono<{ Bindings: Bindings }>()

// Public POST route to submit support message
contact.post('/', async (c) => {
  const { name, email, message } = await c.req.json()

  if (!name || !email || !message) {
    return c.json({ error: 'Name, email, and message are required' }, 400)
  }

  const id = crypto.randomUUID()

  try {
    await c.env.DB.prepare(
      'INSERT INTO contact_messages (id, name, email, message) VALUES (?, ?, ?, ?)'
    ).bind(id, name, email, message).run()

    // Send email alert to Admin
    const adminEmail = c.env.ADMIN_EMAIL || 'historified.rare.books@gmail.com'
    const emailHtml = getAdminSupportNotificationHtml(name, email, message)
    await sendBrevoEmail(c.env.BREVO_API_KEY, {
      toEmail: adminEmail,
      subject: `[Support Inquiry] ${name}: ${message.slice(0, 40)}...`,
      htmlContent: emailHtml
    })

    return c.json({ id, message: 'Message sent successfully' }, 201)
  } catch (error: any) {
    return c.json({ error: 'Failed to save message', details: error.message }, 500)
  }
})

// Protected Admin Routes
contact.use('*', authMiddleware, adminMiddleware)

contact.get('/', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM contact_messages ORDER BY created_at DESC'
    ).all()
    return c.json({ messages: results || [] })
  } catch (error: any) {
    return c.json({ error: 'Failed to fetch messages', details: error.message }, 500)
  }
})

contact.put('/:id/status', async (c) => {
  const id = c.req.param('id')
  const { status } = await c.req.json()

  try {
    await c.env.DB.prepare(
      'UPDATE contact_messages SET status = ? WHERE id = ?'
    ).bind(status || 'READ', id).run()

    return c.json({ message: 'Status updated' })
  } catch (error: any) {
    return c.json({ error: 'Failed to update status', details: error.message }, 500)
  }
})

contact.delete('/:id', async (c) => {
  const id = c.req.param('id')

  try {
    await c.env.DB.prepare(
      'DELETE FROM contact_messages WHERE id = ?'
    ).bind(id).run()

    return c.json({ message: 'Message deleted' })
  } catch (error: any) {
    return c.json({ error: 'Failed to delete message', details: error.message }, 500)
  }
})

export default contact
