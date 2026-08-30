import { Hono } from 'hono'
import { Bindings, User } from '../types'
import { authMiddleware } from '../middleware/auth'
import { adminMiddleware } from '../middleware/admin'

type Variables = {
  user?: User
}

const coupons = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// Helper to generate a random 6-character uppercase alphanumeric code
function generateRandomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Public: Validate a coupon code for a book
coupons.post('/validate', async (c) => {
  const body = await c.req.json()
  const { code, bookId } = body

  if (!code || typeof code !== 'string') {
    return c.json({ valid: false, error: 'Coupon code is required' }, 400)
  }

  const normalizedCode = code.trim().toUpperCase()

  try {
    const coupon = await c.env.DB.prepare(
      'SELECT * FROM coupons WHERE UPPER(code) = ? AND is_active = 1'
    ).bind(normalizedCode).first<any>()

    if (!coupon) {
      return c.json({ valid: false, error: 'Invalid or expired coupon code' }, 404)
    }

    if (coupon.times_used >= coupon.max_uses) {
      return c.json({ valid: false, error: 'Coupon code has reached maximum usage limit' }, 400)
    }

    let originalPrice = 0
    if (bookId) {
      const book = await c.env.DB.prepare('SELECT price FROM books WHERE id = ?').bind(bookId).first<{ price: number }>()
      if (book) {
        originalPrice = book.price
      }
    }

    const discountAmount = Number(coupon.discount_amount) || 0
    const finalPrice = Math.max(1, originalPrice - discountAmount)

    return c.json({
      valid: true,
      code: coupon.code,
      discount_amount: discountAmount,
      original_price: originalPrice,
      final_price: finalPrice
    })
  } catch (error: any) {
    return c.json({ valid: false, error: 'Failed to validate coupon', details: error.message }, 500)
  }
})

// Protected Admin Routes
coupons.use('*', authMiddleware)
coupons.use('*', adminMiddleware)

// Admin: Get all coupons
coupons.get('/', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM coupons ORDER BY created_at DESC'
    ).all()
    return c.json({ coupons: results || [] })
  } catch (error: any) {
    return c.json({ error: 'Failed to fetch coupons', details: error.message }, 500)
  }
})

// Admin: Create a new coupon
coupons.post('/', async (c) => {
  const body = await c.req.json()
  let { code, discount_amount, max_uses } = body

  if (!discount_amount || Number(discount_amount) <= 0) {
    return c.json({ error: 'Valid discount amount in ₹ is required' }, 400)
  }

  // Auto-generate 6-character code if not provided
  if (!code || typeof code !== 'string' || !code.trim()) {
    code = generateRandomCode()
  } else {
    code = code.trim().toUpperCase()
  }

  // Ensure code is 6 characters or standard format
  if (code.length > 20) {
    return c.json({ error: 'Coupon code must be 20 characters or less' }, 400)
  }

  const id = crypto.randomUUID()
  const discountVal = Number(discount_amount)
  const maxUsesVal = Number(max_uses) > 0 ? Number(max_uses) : 1

  try {
    await c.env.DB.prepare(`
      INSERT INTO coupons (id, code, discount_amount, max_uses, times_used, is_active)
      VALUES (?, ?, ?, ?, 0, 1)
    `).bind(id, code, discountVal, maxUsesVal).run()

    return c.json({
      id,
      code,
      discount_amount: discountVal,
      max_uses: maxUsesVal,
      message: 'Coupon created successfully'
    }, 201)
  } catch (error: any) {
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return c.json({ error: `Coupon code '${code}' already exists` }, 400)
    }
    return c.json({ error: 'Failed to create coupon', details: error.message }, 500)
  }
})

// Admin: Delete/Deactivate coupon
coupons.delete('/:id', async (c) => {
  const id = c.req.param('id')

  try {
    await c.env.DB.prepare('DELETE FROM coupons WHERE id = ?').bind(id).run()
    return c.json({ message: 'Coupon deleted successfully' })
  } catch (error: any) {
    return c.json({ error: 'Failed to delete coupon', details: error.message }, 500)
  }
})

export default coupons
