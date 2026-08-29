import { Hono } from 'hono'
import { Bindings, User } from '../types'
import { authMiddleware } from '../middleware/auth'
import { adminMiddleware } from '../middleware/admin'

type Variables = {
  user: User
}

const upload = new Hono<{ Bindings: Bindings, Variables: Variables }>()

upload.use('*', authMiddleware, adminMiddleware)

upload.post('/pdf', async (c) => {
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

    return c.json({ key, message: 'PDF uploaded successfully' })
  } catch (error) {
    return c.json({ error: 'Failed to upload PDF', details: (error as Error).message }, 500)
  }
})

upload.post('/cover', async (c) => {
  try {
    const body = await c.req.parseBody()
    const file = body['file'] as File
    
    if (!file) {
      return c.json({ error: 'No file provided' }, 400)
    }

    const ext = file.name.split('.').pop()
    const key = `covers/${crypto.randomUUID()}.${ext}`
    
    await c.env.R2_BUCKET.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type }
    })

    // Assuming a custom domain or standard public R2 URL
    // You would typically configure a custom domain for public R2 bucket access
    const publicUrl = `https://YOUR_PUBLIC_R2_URL.com/${key}`

    return c.json({ key, url: publicUrl, message: 'Cover uploaded successfully' })
  } catch (error) {
    return c.json({ error: 'Failed to upload cover', details: (error as Error).message }, 500)
  }
})

export default upload
