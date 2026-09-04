import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { Bindings } from './types'

import books from './routes/books'
import upload from './routes/upload'
import payment from './routes/payment'
import reader from './routes/reader'
import user from './routes/user'
import coupons from './routes/coupons'
import contact from './routes/contact'
import webhook from './routes/webhook'

const app = new Hono<{ Bindings: Bindings }>()

app.use(
  '*',
  cors({
    origin: (origin) => origin || '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'Range', 'x-webhook-signature', 'x-webhook-timestamp'],
    exposeHeaders: ['Content-Length', 'Content-Range', 'Accept-Ranges'],
    maxAge: 86400,
    credentials: true,
  })
)

app.get('/', (c) => {
  return c.text('Historified Backend API')
})

app.route('/api/books', books)
app.route('/api/upload', upload)
app.route('/api/payment', payment)
app.route('/api/reader', reader)
app.route('/api/user', user)
app.route('/api/coupons', coupons)
app.route('/api/contact', contact)
app.route('/api/webhook', webhook)

export default app
