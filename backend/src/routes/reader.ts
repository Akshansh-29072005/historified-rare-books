import { Hono } from 'hono'
import { Bindings, User } from '../types'
import { authMiddleware } from '../middleware/auth'

type Variables = {
  user?: User
}

const reader = new Hono<{ Bindings: Bindings, Variables: Variables }>()

/**
 * Helper: Serve a PDF from R2 with HTTP Range Request support.
 * - If client sends `Range` header → returns 206 Partial Content (PDF.js lazy page loading)
 * - Otherwise → returns 200 with full body
 * - Includes proper cache headers, CORS, ETag, Accept-Ranges
 */
async function servePdfFromR2(
  c: any,
  r2Key: string,
  cacheControl: string
): Promise<Response> {
  const rangeHeader = c.req.header('Range')

  // Fetch from R2 with optional range
  let object: R2ObjectBody | null
  if (rangeHeader) {
    object = await c.env.R2_BUCKET.get(r2Key, {
      range: c.req.raw.headers,
    }) as R2ObjectBody | null
  } else {
    object = await c.env.R2_BUCKET.get(r2Key) as R2ObjectBody | null
  }

  if (!object) {
    return c.json({ error: 'PDF file not found in storage' }, 404)
  }

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('content-type', 'application/pdf')
  headers.set('accept-ranges', 'bytes')
  headers.set('cache-control', cacheControl)

  // CORS headers for cross-origin PDF.js requests
  headers.set('access-control-allow-origin', '*')
  headers.set('access-control-allow-headers', 'Authorization, Content-Type, Range')
  headers.set('access-control-expose-headers', 'Content-Length, Content-Range, Content-Type, ETag, Accept-Ranges')

  // If R2 returned a range, send 206 Partial Content
  const r2Range = (object as any).range
  if (rangeHeader && r2Range) {
    const size = (object as any).size || 0
    if ('offset' in r2Range && 'length' in r2Range) {
      headers.set('content-range', `bytes ${r2Range.offset}-${r2Range.offset + r2Range.length - 1}/${size}`)
      headers.set('content-length', String(r2Range.length))
    }
    return new Response(object.body, { status: 206, headers })
  }

  // Full response
  if ((object as any).size) {
    headers.set('content-length', String((object as any).size))
  }
  return new Response(object.body, { status: 200, headers })
}

// Public route for reading sample PDF (first 5 pages)
reader.get('/:bookId/sample-pdf', async (c) => {
  const bookId = c.req.param('bookId')

  const book = await c.env.DB.prepare(
    'SELECT sample_pdf_r2_key FROM books WHERE id = ?'
  ).bind(bookId).first<{ sample_pdf_r2_key?: string }>()
  
  if (!book) {
    return c.json({ error: 'Book not found' }, 404)
  }

  // Only serve the pre-extracted sample PDF — never fall back to the full paid book
  if (!book.sample_pdf_r2_key) {
    return c.json({ error: 'Sample preview not available for this book' }, 404)
  }

  return servePdfFromR2(c, book.sample_pdf_r2_key, 'public, max-age=86400')
})

// Protected routes require authentication
reader.use('*', authMiddleware)

reader.get('/:bookId/pdf', async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const bookId = c.req.param('bookId')

  // Check purchase status (uses indexed column: user_id, book_id, status)
  const purchase = await c.env.DB.prepare(
    'SELECT id FROM purchases WHERE user_id = ? AND book_id = ? AND status = ?'
  ).bind(user.id, bookId, 'COMPLETED').first()

  if (!purchase && user.role !== 'admin') {
    return c.json({ error: 'Purchase required to read this book' }, 403)
  }

  const book = await c.env.DB.prepare('SELECT pdf_r2_key FROM books WHERE id = ?').bind(bookId).first<{ pdf_r2_key: string }>()
  
  if (!book || !book.pdf_r2_key) {
    return c.json({ error: 'PDF not found for this book' }, 404)
  }

  return servePdfFromR2(c, book.pdf_r2_key, 'private, max-age=3600')
})

reader.get('/:bookId/progress', async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const bookId = c.req.param('bookId')

  try {
    const progress = await c.env.DB.prepare(
      'SELECT last_read_page, bookmarks FROM reading_progress WHERE user_id = ? AND book_id = ?'
    ).bind(user.id, bookId).first()

    if (!progress) {
      return c.json({ last_read_page: 1, bookmarks: '[]' })
    }

    return c.json(progress)
  } catch (error) {
    return c.json({ last_read_page: 1, bookmarks: '[]' })
  }
})

reader.put('/:bookId/progress', async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const bookId = c.req.param('bookId')
  const { last_read_page, bookmarks } = await c.req.json()

  try {
    const pageVal = last_read_page !== undefined ? last_read_page : 1
    const bookmarkVal = typeof bookmarks === 'string' ? bookmarks : JSON.stringify(bookmarks || [])

    await c.env.DB.prepare(`
      INSERT INTO reading_progress (user_id, book_id, last_read_page, bookmarks)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, book_id) DO UPDATE SET
        last_read_page = excluded.last_read_page,
        bookmarks = excluded.bookmarks
    `).bind(
      user.id, 
      bookId, 
      pageVal, 
      bookmarkVal
    ).run()

    return c.json({ message: 'Progress updated successfully' })
  } catch (error) {
    return c.json({ error: 'Failed to update progress', details: (error as Error).message }, 500)
  }
})

export default reader
