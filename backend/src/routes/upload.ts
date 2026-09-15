import { Hono } from 'hono'
import { Bindings, User } from '../types'
import { authMiddleware } from '../middleware/auth'
import { adminMiddleware } from '../middleware/admin'

type Variables = {
  user: User
}

const upload = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// Public route to serve cover images from R2
upload.get('/cover/:filename', async (c) => {
  const filename = c.req.param('filename')
  const key = `covers/${filename}`
  const object = await c.env.R2_BUCKET.get(key)
  if (!object) {
    return c.json({ error: 'Cover image not found' }, 404)
  }
  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('cache-control', 'public, max-age=31536000')
  headers.set('access-control-allow-origin', '*')
  return new Response(object.body, { headers })
})

// Protected routes for uploading (using PUT with raw body to stream directly to R2 and avoid 128MB memory limit)
upload.put('/pdf', authMiddleware, adminMiddleware, async (c) => {
  try {
    const ext = c.req.header('X-File-Ext') || 'pdf'
    const key = `pdfs/${crypto.randomUUID()}.${ext}`
    
    await c.env.R2_BUCKET.put(key, c.req.raw.body, {
      httpMetadata: { contentType: 'application/pdf' }
    })

    return c.json({ key, pdf_r2_key: key, message: 'PDF uploaded successfully' })
  } catch (error) {
    return c.json({ error: 'Failed to upload PDF', details: (error as Error).message }, 500)
  }
})

upload.put('/cover', authMiddleware, adminMiddleware, async (c) => {
  try {
    const ext = c.req.header('X-File-Ext') || 'png'
    const contentType = c.req.header('Content-Type') || 'image/png'
    const filename = `${crypto.randomUUID()}.${ext}`
    const key = `covers/${filename}`
    
    await c.env.R2_BUCKET.put(key, c.req.raw.body, {
      httpMetadata: { contentType }
    })

    // Dynamic origin so staging uses staging domain and production uses production domain
    const origin = new URL(c.req.url).origin
    const publicUrl = `${origin}/api/upload/cover/${filename}`

    return c.json({ key, url: publicUrl, cover_url: publicUrl, message: 'Cover uploaded successfully' })
  } catch (error) {
    return c.json({ error: 'Failed to upload cover', details: (error as Error).message }, 500)
  }
})

upload.put('/qr', authMiddleware, adminMiddleware, async (c) => {
  try {
    const ext = c.req.header('X-File-Ext') || 'png'
    const contentType = c.req.header('Content-Type') || 'image/png'
    const filename = `${crypto.randomUUID()}.${ext}`
    const key = `covers/${filename}`
    
    await c.env.R2_BUCKET.put(key, c.req.raw.body, {
      httpMetadata: { contentType }
    })

    const origin = new URL(c.req.url).origin
    const publicUrl = `${origin}/api/upload/cover/${filename}`

    return c.json({ key, url: publicUrl, message: 'QR Code uploaded successfully' })
  } catch (error) {
    return c.json({ error: 'Failed to upload QR Code', details: (error as Error).message }, 500)
  }
})
upload.post('/pages', authMiddleware, adminMiddleware, async (c) => {
  try {
    const body = await c.req.parseBody()
    const bookId = body['bookId'] as string
    if (!bookId) return c.json({ error: 'bookId required' }, 400)
    
    let uploadedCount = 0;

    for (const [key, value] of Object.entries(body)) {
      if (key.startsWith('page_') && value instanceof File) {
        const pageNumber = key.replace('page_', '');
        const r2Key = `image_books/${bookId}/${pageNumber}.webp`;
        const buffer = await value.arrayBuffer();
        
        await c.env.R2_BUCKET.put(r2Key, buffer, {
          httpMetadata: { contentType: 'image/webp' }
        });
        
        uploadedCount++;
      }
    }

    return c.json({ success: true, uploadedCount, message: `Successfully uploaded ${uploadedCount} pages` })
  } catch (error) {
    return c.json({ error: 'Failed to upload pages', details: (error as Error).message }, 500)
  }
})

export default upload
