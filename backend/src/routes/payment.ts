import { Hono } from 'hono'
import { Bindings, User } from '../types'
import { authMiddleware } from '../middleware/auth'

type Variables = {
  user: User
}

const payment = new Hono<{ Bindings: Bindings, Variables: Variables }>()

payment.post('/create-order', authMiddleware, async (c) => {
  const user = c.get('user')
  const { bookId } = await c.req.json()

  if (!bookId) {
    return c.json({ error: 'Book ID is required' }, 400)
  }

  // Get book price
  const book = await c.env.DB.prepare('SELECT price FROM books WHERE id = ?').bind(bookId).first<{ price: number }>()
  
  if (!book) {
    return c.json({ error: 'Book not found' }, 404)
  }

  const orderId = `order_${crypto.randomUUID()}`

  try {
    const cashfreeRes = await fetch(`${c.env.CASHFREE_API_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': c.env.CASHFREE_APP_ID,
        'x-client-secret': c.env.CASHFREE_SECRET_KEY,
        'x-api-version': '2023-08-01'
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: book.price,
        order_currency: 'INR',
        customer_details: {
          customer_id: user.id,
          customer_name: user.name || 'User',
          customer_email: user.email || 'user@example.com',
          customer_phone: '9999999999' // Requires actual phone usually
        },
        order_meta: {
          return_url: `http://localhost:5173/payment/verify?order_id=${orderId}`
        }
      })
    })

    if (!cashfreeRes.ok) {
      const errorText = await cashfreeRes.text()
      throw new Error(`Cashfree error: ${errorText}`)
    }

    const orderData = await cashfreeRes.json() as any

    // Insert pending purchase
    await c.env.DB.prepare(
      'INSERT INTO purchases (id, user_id, book_id, amount, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime("now"), datetime("now"))'
    ).bind(orderId, user.id, bookId, book.price, 'PENDING').run()

    return c.json({
      payment_session_id: orderData.payment_session_id,
      order_id: orderId
    })
  } catch (error) {
    return c.json({ error: 'Failed to create order', details: (error as Error).message }, 500)
  }
})

payment.post('/verify', authMiddleware, async (c) => {
  const { orderId } = await c.req.json()

  if (!orderId) {
    return c.json({ error: 'Order ID is required' }, 400)
  }

  try {
    const cashfreeRes = await fetch(`${c.env.CASHFREE_API_URL}/orders/${orderId}`, {
      headers: {
        'x-client-id': c.env.CASHFREE_APP_ID,
        'x-client-secret': c.env.CASHFREE_SECRET_KEY,
        'x-api-version': '2023-08-01'
      }
    })

    if (!cashfreeRes.ok) {
      throw new Error('Failed to fetch order status from Cashfree')
    }

    const orderData = await cashfreeRes.json() as any

    if (orderData.order_status === 'PAID') {
      await c.env.DB.prepare(
        'UPDATE purchases SET status = ?, updated_at = datetime("now") WHERE id = ?'
      ).bind('COMPLETED', orderId).run()
      
      return c.json({ status: 'COMPLETED' })
    }

    return c.json({ status: orderData.order_status })
  } catch (error) {
    return c.json({ error: 'Failed to verify order', details: (error as Error).message }, 500)
  }
})

payment.post('/webhook', async (c) => {
  const rawBody = await c.req.text()
  const signature = c.req.header('x-webhook-signature')
  
  if (!signature) {
    return c.json({ error: 'Missing signature' }, 401)
  }
  
  const timestamp = c.req.header('x-webhook-timestamp')
  const payloadToVerify = `${timestamp}${rawBody}`

  try {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(c.env.CASHFREE_SECRET_KEY),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )
    
    // Decode base64 signature
    const signatureBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0))
    
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      encoder.encode(payloadToVerify)
    )

    if (!isValid) {
      return c.json({ error: 'Invalid signature' }, 401)
    }

    const data = JSON.parse(rawBody)
    
    if (data.type === 'PAYMENT_SUCCESS_WEBHOOK') {
      const orderId = data.data.order.order_id
      await c.env.DB.prepare(
        'UPDATE purchases SET status = ?, updated_at = datetime("now") WHERE id = ?'
      ).bind('COMPLETED', orderId).run()
    }

    return c.text('OK')
  } catch (error) {
    return c.json({ error: 'Webhook processing failed' }, 500)
  }
})

export default payment
