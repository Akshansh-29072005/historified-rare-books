import { Hono } from 'hono'
import { Bindings } from '../types'
import { sendBrevoEmail, getPurchaseThankYouEmailHtml } from '../lib/email'

const webhook = new Hono<{ Bindings: Bindings }>()

// Server-to-Server Webhook Endpoint for Cashfree Payment Notifications
webhook.post('/cashfree', async (c) => {
  try {
    const body = await c.req.json() as any

    // Cashfree Webhook payload structure
    const data = body?.data
    const order = data?.order
    const payment = data?.payment

    const orderId = order?.order_id || body?.order_id
    const paymentStatus = payment?.payment_status || data?.payment_status || body?.type

    if (!orderId) {
      return c.json({ error: 'Missing order_id' }, 400)
    }

    if (paymentStatus === 'SUCCESS' || paymentStatus === 'PAID' || body?.type === 'PAYMENT_SUCCESS_WEBHOOK') {
      // Find pending purchase record
      const purchase = await c.env.DB.prepare(
        'SELECT * FROM purchases WHERE cashfree_order_id = ?'
      ).bind(orderId).first<any>()

      if (purchase && purchase.status !== 'COMPLETED') {
        // Mark purchase completed
        await c.env.DB.prepare(
          'UPDATE purchases SET status = ? WHERE id = ?'
        ).bind('COMPLETED', purchase.id).run()

        // Fetch book details & user email to send receipt
        const book = await c.env.DB.prepare(
          'SELECT title, price FROM books WHERE id = ?'
        ).bind(purchase.book_id).first<any>()

        const user = await c.env.DB.prepare(
          'SELECT email, name FROM users WHERE id = ?'
        ).bind(purchase.user_id).first<any>()

        if (user && user.email && book) {
          const emailHtml = getPurchaseThankYouEmailHtml(book.title, book.price, orderId)
          // Send email in background — don't block webhook response
          c.executionCtx.waitUntil(
            sendBrevoEmail(c.env.BREVO_API_KEY, {
              toEmail: user.email,
              toName: user.name || user.email,
              subject: `Order Confirmed: ${book.title} - Historified`,
              htmlContent: emailHtml
            })
          )
        }
      }

      return c.json({ status: 'OK', message: 'Webhook processed' })
    }

    return c.json({ status: 'IGNORED', message: `Status is ${paymentStatus}` })
  } catch (error: any) {
    console.error('Webhook processing error:', error)
    return c.json({ error: 'Webhook handler error', details: error.message }, 500)
  }
})

export default webhook
