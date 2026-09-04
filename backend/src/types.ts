export type Bindings = {
  DB: D1Database
  R2_BUCKET: R2Bucket
  CASHFREE_APP_ID: string
  CASHFREE_SECRET_KEY: string
  CASHFREE_API_URL: string
  FIREBASE_PROJECT_ID: string
  ADMIN_EMAIL: string
  BREVO_API_KEY?: string
}

export type User = {
  id: string
  email: string
  name: string
  role: string
}
