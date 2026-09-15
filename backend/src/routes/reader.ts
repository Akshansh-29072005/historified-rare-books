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

  let r2Range: any = undefined
  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d+)?-(\d+)?/)
    if (match) {
      if (match[1] !== undefined && match[2] !== undefined) {
        // e.g. bytes=0-100
        r2Range = {
          offset: parseInt(match[1], 10),
          length: parseInt(match[2], 10) - parseInt(match[1], 10) + 1
        }
      } else if (match[1] !== undefined && match[2] === undefined) {
        // e.g. bytes=100- (from offset to end)
        r2Range = { offset: parseInt(match[1], 10) }
      } else if (match[1] === undefined && match[2] !== undefined) {
        // e.g. bytes=-100 (last 100 bytes)
        r2Range = { suffix: parseInt(match[2], 10) }
      }
    }
  }

  // Fetch from R2 with optional range explicitly parsed
  let object = await c.env.R2_BUCKET.get(r2Key, r2Range ? { range: r2Range } : undefined) as R2ObjectBody | null

  if (!object) {
    return c.json({ error: 'PDF file not found in storage' }, 404)
  }

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('content-type', 'application/pdf')
  headers.set('accept-ranges', 'bytes')
  headers.set('cache-control', cacheControl)

  const fulfilledRange = (object as any).range
  if (fulfilledRange && 'offset' in fulfilledRange && 'length' in fulfilledRange) {
    const size = (object as any).size || 0
    headers.set('content-range', `bytes ${fulfilledRange.offset}-${fulfilledRange.offset + fulfilledRange.length - 1}/${size}`)
    headers.set('content-length', String(fulfilledRange.length))
    return new Response(object.body, { status: 206, headers })
  }

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

// Public route for reading sample image pages (first 5 pages)
reader.get('/:bookId/sample-pages/:pageNumber', async (c) => {
  const bookId = c.req.param('bookId')
  const pageNumber = parseInt(c.req.param('pageNumber'), 10)

  if (isNaN(pageNumber) || pageNumber < 1 || pageNumber > 5) {
    return c.json({ error: 'Invalid sample page number. Only pages 1-5 are allowed.' }, 400)
  }

  const book = await c.env.DB.prepare(
    'SELECT is_image_based FROM books WHERE id = ?'
  ).bind(bookId).first<{ is_image_based: boolean }>()
  
  if (!book || !book.is_image_based) {
    return c.json({ error: 'Book not found or not image-based' }, 404)
  }

  const r2Key = `image_books/${bookId}/${pageNumber}.webp`
  const object = await c.env.R2_BUCKET.get(r2Key)
  
  if (!object) {
    return c.json({ error: 'Page not found' }, 404)
  }

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('cache-control', 'public, max-age=86400')
  headers.set('access-control-allow-origin', '*')
  
  return new Response(object.body, { headers })
})

// Protected routes require authentication
reader.use('*', authMiddleware)

reader.get('/:bookId/pages/:pageNumber', async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const bookId = c.req.param('bookId')
  const pageNumber = parseInt(c.req.param('pageNumber'), 10)

  if (isNaN(pageNumber) || pageNumber < 1) {
    return c.json({ error: 'Invalid page number' }, 400)
  }

  // Check purchase status
  const purchase = await c.env.DB.prepare(
    'SELECT id FROM purchases WHERE user_id = ? AND book_id = ? AND UPPER(status) = ?'
  ).bind(user.id, bookId, 'COMPLETED').first()

  if (!purchase && user.role !== 'admin') {
    return c.json({ error: 'Purchase required to read this book' }, 403)
  }

  const book = await c.env.DB.prepare(
    'SELECT is_image_based FROM books WHERE id = ?'
  ).bind(bookId).first<{ is_image_based: boolean }>()
  
  if (!book || !book.is_image_based) {
    return c.json({ error: 'Book not found or not image-based' }, 404)
  }

  const r2Key = `image_books/${bookId}/${pageNumber}.webp`
  const object = await c.env.R2_BUCKET.get(r2Key)
  
  if (!object) {
    return c.json({ error: 'Page not found' }, 404)
  }

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('cache-control', 'public, max-age=86400')
  
  return new Response(object.body, { headers })
})

reader.get('/:bookId/pdf', async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const bookId = c.req.param('bookId')

  // Check purchase status (uses indexed column: user_id, book_id, status)
  const purchase = await c.env.DB.prepare(
    'SELECT id FROM purchases WHERE user_id = ? AND book_id = ? AND UPPER(status) = ?'
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
