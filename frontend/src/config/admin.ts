/**
 * Central Admin Email Configuration
 * 
 * Update these three constants anytime to grant Admin privileges to:
 * 1. Admin 1 (Your main account)
 * 2. Admin 2 (Your cousin's account)
 * 3. Admin 3 (Shared / Common account)
 */

export const ADMIN_1_EMAIL = 'akshanshkhairwar@gmail.com'; // Admin 1: Me
export const ADMIN_2_EMAIL = 'shiwanikumar04@gmail.com';         // Admin 2: Cousin (Fill email here)
export const ADMIN_3_EMAIL = 'historified.rare.books@gmail.com';         // Admin 3: Common Account (Fill email here)

// List of all authorized admin emails
export const ADMIN_EMAILS: string[] = [
  ADMIN_1_EMAIL,
  ADMIN_2_EMAIL,
  ADMIN_3_EMAIL
];

// Helper to check if an email has Admin permissions
export const isAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  const target = email.toLowerCase().trim();
  return ADMIN_EMAILS.some(adminEmail => adminEmail.toLowerCase().trim() === target);
};
