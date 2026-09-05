export interface SendEmailOptions {
  toEmail: string;
  toName?: string;
  subject: string;
  htmlContent: string;
}

/**
 * Sends a transactional email using the Brevo REST API (v3)
 */
export async function sendBrevoEmail(apiKey: string | undefined, options: SendEmailOptions) {
  if (!apiKey) {
    console.warn('BREVO_API_KEY is not set. Skipping email send.', options.subject);
    return false;
  }

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'Historified Rare Books',
          email: 'historified.rare.books@gmail.com',
        },
        to: [
          {
            email: options.toEmail,
            name: options.toName || options.toEmail,
          },
        ],
        subject: options.subject,
        htmlContent: options.htmlContent,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Brevo Email API Error:', errText);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Failed to send email via Brevo:', err);
    return false;
  }
}

/**
 * Generates branded HTML template for purchase confirmation
 */
export function getPurchaseThankYouEmailHtml(bookTitle: string, price: number, orderId: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Georgia', serif; background-color: #FAF7F2; color: #2C1810; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E6DFD5; border-radius: 12px; overflow: hidden; }
    .header { background: #2C1810; color: #FAF7F2; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: normal; letter-spacing: 1px; }
    .content { padding: 30px; line-height: 1.6; }
    .book-card { background: #FAF7F2; border-left: 4px solid #2C1810; padding: 15px 20px; margin: 20px 0; border-radius: 4px; }
    .btn { display: inline-block; background: #2C1810; color: #FAF7F2 !important; text-decoration: none; padding: 12px 28px; border-radius: 25px; font-weight: bold; font-size: 14px; margin-top: 15px; }
    .footer { background: #F4EFE6; padding: 20px; text-align: center; font-size: 12px; color: #7A695D; border-t: 1px solid #E6DFD5; }
    .footer a { color: #2C1810; text-decoration: underline; margin: 0 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>HISTORIFIED RARE BOOKS</h1>
    </div>
    <div class="content">
      <h2 style="font-size: 20px; margin-top: 0;">Thank You for Your Order!</h2>
      <p>We are delighted to confirm your digital manuscript acquisition. Your rare book is now unlocked and available in your library for online reading.</p>
      
      <div class="book-card">
        <h3 style="margin: 0 0 5px 0; font-size: 16px;">${bookTitle}</h3>
        <p style="margin: 0; color: #7A695D; font-size: 14px;">Order ID: <strong>${orderId}</strong> | Amount Paid: <strong>₹${price}</strong></p>
      </div>

      <p style="text-align: center;">
        <a href="https://historified-rare-books.pages.dev/my-books" class="btn">Read Your Book Now</a>
      </p>
      
      <p style="font-size: 13px; color: #7A695D; margin-top: 25px;">
        If you have any questions or need assistance accessing your library, please don't hesitate to reach out to our support team.
      </p>
    </div>
    <div class="footer">
      <p style="margin-bottom: 10px;">&copy; ${new Date().getFullYear()} Historified Rare Books. All rights reserved.</p>
      <p>
        <a href="https://historified-rare-books.pages.dev/contact">Contact Us</a> | 
        <a href="https://historified-rare-books.pages.dev/terms">Terms of Service</a> | 
        <a href="https://historified-rare-books.pages.dev/privacy">Privacy Policy</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generates HTML notification email for Admin when a new support message is received
 */
export function getAdminSupportNotificationHtml(name: string, email: string, message: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Helvetica', 'Arial', sans-serif; background-color: #f9f9f9; color: #333; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 25px; }
    .badge { display: inline-block; background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; }
    .msg-box { background: #f3f4f6; border-left: 4px solid #1f2937; padding: 15px; margin: 15px 0; white-space: pre-wrap; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <span class="badge">NEW SUPPORT INQUIRY</span>
    <h2 style="margin-top: 10px; font-size: 18px;">Customer Inquiry Received</h2>
    <p><strong>From:</strong> ${name} (&lt;<a href="mailto:${email}">${email}</a>&gt;)</p>
    <div class="msg-box">${message}</div>
    <p><a href="https://historified-rare-books.pages.dev/admin" style="color: #2563eb;">View in Admin Dashboard &rarr;</a></p>
  </div>
</body>
</html>
  `;
}
