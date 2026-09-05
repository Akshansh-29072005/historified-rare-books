import { Hono } from 'hono'
import { Bindings, User } from '../types'
import { authMiddleware } from '../middleware/auth'

type Variables = {
  user: User
}

const payment = new Hono<{ Bindings: Bindings, Variables: Variables }>()

payment.post('/create-order', authMiddleware, async (c) => {
  const user = c.get('user')
  const body = await c.req.json()
  const { bookId, couponCode, customerPhone, customerEmail, customerName } = body

  if (!bookId) {
    return c.json({ error: 'Book ID is required' }, 400)
  }

  // Get book price
  const book = await c.env.DB.prepare('SELECT price FROM books WHERE id = ?').bind(bookId).first<{ price: number }>()
  
  if (!book) {
    return c.json({ error: 'Book not found' }, 404)
  }

  let finalAmount = book.price
  let appliedCouponCode: string | null = null

  // Server-side coupon verification
  if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
    const normalizedCode = couponCode.trim().toUpperCase()
    const coupon = await c.env.DB.prepare(
      'SELECT * FROM coupons WHERE UPPER(code) = ? AND is_active = 1'
    ).bind(normalizedCode).first<any>()

    if (coupon && coupon.times_used < coupon.max_uses) {
      appliedCouponCode = coupon.code
      const discountVal = Number(coupon.discount_amount) || 0
      finalAmount = Math.max(1, book.price - discountVal)
    }
  }

  const orderId = `order_${crypto.randomUUID()}`
  const origin = c.req.header('origin') || 'https://historified-rare-books.pages.dev'

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
        order_amount: finalAmount,
        order_currency: 'INR',
        customer_details: {
          customer_id: user.id,
          customer_name: customerName || user.name || 'User',
          customer_email: customerEmail || user.email || 'user@example.com',
          customer_phone: customerPhone || '9999999999'
        },
        order_meta: {
          return_url: `${origin}/book/${bookId}?order_id=${orderId}${appliedCouponCode ? `&coupon=${appliedCouponCode}` : ''}`
        }
      })
    })

    if (!cashfreeRes.ok) {
      const errorText = await cashfreeRes.text()
      throw new Error(`Cashfree error: ${errorText}`)
    }

    const orderData = await cashfreeRes.json() as any

    // Insert pending purchase
    const purchaseId = crypto.randomUUID()
    await c.env.DB.prepare(
      'INSERT INTO purchases (id, user_id, book_id, cashfree_order_id, status) VALUES (?, ?, ?, ?, ?)'
    ).bind(purchaseId, user.id, bookId, orderId, 'PENDING').run()

    return c.json({
      payment_session_id: orderData.payment_session_id,
      order_id: orderId,
      final_amount: finalAmount,
      applied_coupon: appliedCouponCode
    })
  } catch (error) {
    return c.json({ error: 'Failed to create order', details: (error as Error).message }, 500)
  }
})

payment.post('/verify', authMiddleware, async (c) => {
  const { orderId, couponCode } = await c.req.json()

  if (!orderId) {
    return c.json({ error: 'Order ID is required' }, 400)
  }

  try {
    const cashfreeRes = await fetch(`${c.env.CASHFREE_API_URL}/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': c.env.CASHFREE_APP_ID,
        'x-client-secret': c.env.CASHFREE_SECRET_KEY,
        'x-api-version': '2023-08-01'
      }
    })

    if (!cashfreeRes.ok) {
      const errorText = await cashfreeRes.text()
      throw new Error(`Cashfree verification error: ${errorText}`)
    }

    const orderData = await cashfreeRes.json() as any

    if (orderData.order_status === 'PAID') {
      await c.env.DB.prepare(
        'UPDATE purchases SET status = ? WHERE cashfree_order_id = ?'
      ).bind('COMPLETED', orderId).run()

      // Increment coupon usage if applied
      if (couponCode && typeof couponCode === 'string') {
        await c.env.DB.prepare(
          'UPDATE coupons SET times_used = times_used + 1 WHERE UPPER(code) = ?'
        ).bind(couponCode.trim().toUpperCase()).run()
      }

      return c.json({ status: 'COMPLETED', message: 'Payment verified and purchase recorded' })
    }

    return c.json({ status: orderData.order_status, message: 'Payment not completed yet' })
  } catch (error) {
    return c.json({ error: 'Failed to verify payment', details: (error as Error).message }, 500)
  }
})

export default payment
