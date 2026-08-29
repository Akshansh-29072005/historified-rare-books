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
  return new Response(object.body, { headers })
})

// Protected routes for uploading
upload.post('/pdf', authMiddleware, adminMiddleware, async (c) => {
  try {
    const body = await c.req.parseBody()
    const file = body['file'] as File
    
    if (!file) {
      return c.json({ error: 'No file provided' }, 400)
    }

    const ext = file.name.split('.').pop()
    const key = `pdfs/${crypto.randomUUID()}.${ext}`
    
    await c.env.R2_BUCKET.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type }
    })

    return c.json({ key, pdf_r2_key: key, message: 'PDF uploaded successfully' })
  } catch (error) {
    return c.json({ error: 'Failed to upload PDF', details: (error as Error).message }, 500)
  }
})

upload.post('/cover', authMiddleware, adminMiddleware, async (c) => {
  try {
    const body = await c.req.parseBody()
    const file = body['file'] as File
    
    if (!file) {
      return c.json({ error: 'No file provided' }, 400)
    }

    const ext = file.name.split('.').pop()
    const filename = `${crypto.randomUUID()}.${ext}`
    const key = `covers/${filename}`
    
    await c.env.R2_BUCKET.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type }
    })

    const publicUrl = `https://backend.akshanshkhairwar2.workers.dev/api/upload/cover/${filename}`

    return c.json({ key, url: publicUrl, cover_url: publicUrl, message: 'Cover uploaded successfully' })
  } catch (error) {
    return c.json({ error: 'Failed to upload cover', details: (error as Error).message }, 500)
  }
})

export default upload
