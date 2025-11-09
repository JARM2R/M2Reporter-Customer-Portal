# M2 Reporter Customer Portal - Complete Setup Guide

This guide will walk you through deploying the M2 Reporter customer portal from start to finish.

## 📋 Prerequisites

Before you begin, ensure you have:

- [ ] A Vercel account (https://vercel.com)
- [ ] A GitHub account with this repository
- [ ] A domain name (optional, but recommended)
- [ ] Access to email DNS settings (for email verification)

## 🚀 Step 1: Deploy to Vercel

### 1.1 Connect Your GitHub Repository

1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select your `M2R-Software-Files` repository
4. Select the branch: `claude/customer-login-portal-011CUuNXRGCLwwFHNKz9hYWm`
5. Click "Import"

### 1.2 Configure Build Settings

Vercel should auto-detect Next.js. Verify these settings:

- **Framework Preset**: Next.js
- **Root Directory**: `./` (leave as default)
- **Build Command**: `next build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### 1.3 Add Environment Variables

Click "Environment Variables" and add the following:

**Required immediately:**
```
NEXTAUTH_SECRET=<generate-this-below>
NEXTAUTH_URL=https://your-domain.vercel.app
```

**To generate NEXTAUTH_SECRET** (run this in your terminal):
```bash
openssl rand -base64 32
```

**Note**: We'll add database and email variables after setting up those services.

### 1.4 Deploy

Click "Deploy" and wait for the build to complete (2-3 minutes).

---

## 🗄️ Step 2: Set Up Vercel Postgres Database

### 2.1 Create Database

1. Go to your Vercel dashboard
2. Click on your project
3. Go to the "Storage" tab
4. Click "Create Database"
5. Select "Postgres"
6. Choose a region (same as your deployment for best performance)
7. Click "Create"

### 2.2 Get Database Connection Strings

1. Click on your new database
2. Go to the ".env.local" tab
3. Copy these environment variables:
   - `POSTGRES_URL`
   - `POSTGRES_PRISMA_URL`
   - `POSTGRES_URL_NON_POOLING`

### 2.3 Add Database Variables to Your Project

1. Go back to your project settings
2. Click "Environment Variables"
3. Add the three Postgres variables
4. Click "Save"
5. Redeploy your project (Settings → Deployments → Latest → ⋯ → Redeploy)

### 2.4 Initialize Database Schema

1. Go to your database in Vercel
2. Click the "Query" tab
3. Copy the entire contents of `schema.sql` from your repository
4. Paste it into the query editor
5. Click "Run Query"
6. Verify all tables were created (should see: companies, users, file_permissions, audit_log)

---

## 📦 Step 3: Set Up Vercel Blob Storage

### 3.1 Create Blob Store

1. In your Vercel dashboard, go to "Storage"
2. Click "Create Database"
3. Select "Blob"
4. Click "Create"

### 3.2 Get Blob Token

1. Click on your new Blob store
2. Copy the `BLOB_READ_WRITE_TOKEN`

### 3.3 Add to Environment Variables

1. Go to project settings → Environment Variables
2. Add: `BLOB_READ_WRITE_TOKEN=<your-token>`
3. Save and redeploy

---

## 📧 Step 4: Set Up Email (Resend)

### 4.1 Create Resend Account

1. Go to https://resend.com
2. Sign up for a free account (3,000 emails/month free)
3. Verify your email address

### 4.2 Add and Verify Your Domain

1. In Resend dashboard, go to "Domains"
2. Click "Add Domain"
3. Enter your domain (e.g., `m2reporter.com`)
4. Add the DNS records shown to your domain's DNS settings:
   - **SPF Record** (TXT)
   - **DKIM Record** (TXT)
   - **DMARC Record** (TXT, optional but recommended)

**Wait for DNS propagation (can take up to 48 hours, usually 15-30 minutes)**

### 4.3 Get API Key

1. Go to "API Keys" in Resend
2. Click "Create API Key"
3. Name it "M2Reporter Production"
4. Copy the API key (starts with `re_`)

### 4.4 Add Email Environment Variables

Add these to Vercel Environment Variables:

```
RESEND_API_KEY=re_xxxxxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com
```

**Important**: `FROM_EMAIL` must use your verified domain!

Redeploy your application.

---

## 👤 Step 5: Create Your First Admin User

Since there's no public signup, you need to manually create the first admin account.

### 5.1 Create a Test Company

In Vercel Postgres Query tab, run:

```sql
INSERT INTO companies (company_name, account_status)
VALUES ('M2 Reporter Admin', 'active')
RETURNING id;
```

**Note the ID returned (you'll need it in the next step)**

### 5.2 Create Admin User

Replace `YOUR_EMAIL`, `YOUR_USERNAME`, and `COMPANY_ID` (from step 5.1):

```sql
INSERT INTO users (
  email,
  username,
  company_id,
  password_hash,
  is_activated,
  role
)
VALUES (
  'YOUR_EMAIL@example.com',
  'YOUR_USERNAME',
  COMPANY_ID,
  '$2a$12$dummy.hash.will.be.replaced.on.first.login',
  false,
  'admin'
)
RETURNING id, email, username;
```

### 5.3 Create Invite Token for Admin

Get the user ID from the previous step, then run:

```sql
UPDATE users
SET invite_token = 'admin-first-login',
    invite_expires = NOW() + INTERVAL '7 days'
WHERE id = YOUR_USER_ID;
```

### 5.4 Activate Your Admin Account

1. Go to: `https://your-domain.vercel.app/activate?token=admin-first-login`
2. Set a strong password (minimum 8 characters)
3. Click "Activate Account"
4. You'll be redirected to the login page

### 5.5 Login as Admin

1. Go to: `https://your-domain.vercel.app/login`
2. Enter your username and password
3. You should see the admin dashboard at `/admin`

---

## 📁 Step 6: Set Up Folder Structure

### 6.1 Verify Default Folders

The schema already created two shared folders. Verify by running:

```sql
SELECT * FROM file_permissions;
```

You should see:
- Program Files (program_files)
- 360 Solutions (shared)

### 6.2 Create Company-Specific Folders

For each customer company, create a dedicated folder:

```sql
-- First, create the company
INSERT INTO companies (company_name, account_status)
VALUES ('Example Customer LLC', 'active')
RETURNING id;

-- Then create their folder (use the company ID from above)
INSERT INTO file_permissions (
  company_id,
  folder_name,
  folder_type,
  blob_prefix
)
VALUES (
  COMPANY_ID,
  'Example Customer LLC',
  'company_specific',
  'company/example-customer-llc/'
);
```

---

## 🧪 Step 7: Test Your Portal

### 7.1 Test Admin Functions

1. **Login as Admin**
   - Go to `/admin`
   - Verify you see the admin dashboard

2. **Create a Test User**
   - Click "+ New User"
   - Select the test company
   - Enter email: `test@example.com`
   - Enter username: `testuser`
   - Click "Create Invite"
   - Check that email was sent

3. **Verify Email Delivery**
   - Check Resend dashboard for delivery status
   - Check spam folder if not received

### 7.2 Test Customer Account Activation

1. Open the activation email
2. Click the activation link
3. Set a password
4. Verify redirection to login page

### 7.3 Test Customer Functions

1. **Login as Customer**
   - Use the test account credentials
   - Verify redirect to `/dashboard`

2. **Test File Upload**
   - Click on a folder
   - Upload a test file (PDF, CSV, etc.)
   - Verify file appears in list

3. **Test File Download**
   - Click "Download" on the uploaded file
   - Verify file downloads correctly

4. **Test Access Control**
   - Verify customer only sees their company's folders
   - Verify shared folders are visible

### 7.4 Test Payment Restriction

Suspend a test account and verify restricted access:

```sql
UPDATE companies
SET account_status = 'past_due'
WHERE company_name = 'Test Company';
```

- Customer should see warning banner
- Upload should be disabled
- Download should be disabled

---

## 🔒 Step 8: Security Hardening

### 8.1 Update NEXTAUTH_URL to Production Domain

If using a custom domain:

```
NEXTAUTH_URL=https://portal.m2reporter.com
```

Redeploy after updating.

### 8.2 Set Up Custom Domain (Optional)

1. In Vercel project settings → Domains
2. Add your domain (e.g., `portal.m2reporter.com`)
3. Add the DNS records shown to your domain provider
4. Wait for verification

### 8.3 Enable Security Features

The portal includes built-in security features:

- ✅ Rate limiting on login attempts
- ✅ File type validation
- ✅ Content Security Policy headers
- ✅ CORS restrictions
- ✅ Input sanitization

### 8.4 Review Audit Logs

Periodically review audit logs:

```sql
SELECT
  u.username,
  al.action,
  al.resource_type,
  al.ip_address,
  al.created_at
FROM audit_log al
LEFT JOIN users u ON al.user_id = u.id
ORDER BY al.created_at DESC
LIMIT 100;
```

---

## 📊 Step 9: Monitoring & Maintenance

### 9.1 Set Up Vercel Monitoring

1. Go to your project → Analytics
2. Enable Web Analytics
3. Monitor:
   - Page load times
   - Error rates
   - Traffic patterns

### 9.2 Monitor Email Delivery

1. Check Resend dashboard regularly
2. Monitor bounce rates
3. Check for spam complaints

### 9.3 Monitor Storage Usage

1. Go to Vercel → Storage → Blob
2. Monitor storage usage
3. Set up alerts for limits

### 9.4 Database Backups

Vercel Postgres includes automatic backups:
- Daily backups retained for 7 days
- Point-in-time recovery available

**Manual backup** (optional):
```bash
# Export data
vercel env pull .env.local
pg_dump $POSTGRES_URL > backup-$(date +%Y%m%d).sql
```

### 9.5 Regular Maintenance Tasks

**Weekly:**
- [ ] Review audit logs for suspicious activity
- [ ] Check email delivery rates
- [ ] Monitor storage usage

**Monthly:**
- [ ] Review and clean up old files
- [ ] Check for failed login attempts
- [ ] Update dependencies: `npm audit && npm update`

**Quarterly:**
- [ ] Security audit
- [ ] Review access permissions
- [ ] Update passwords
- [ ] Test disaster recovery

---

## 🆘 Troubleshooting

### Issue: Email Not Sending

**Check:**
1. Resend API key is correct
2. Domain is verified in Resend
3. `FROM_EMAIL` uses verified domain
4. Check Resend dashboard for errors

**Fix:**
```bash
# Test email manually
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "noreply@yourdomain.com",
    "to": "test@example.com",
    "subject": "Test Email",
    "html": "<p>Test</p>"
  }'
```

### Issue: Database Connection Error

**Check:**
1. All three Postgres environment variables are set
2. Variables match what's in the database dashboard
3. Redeploy after adding variables

**Fix:**
- Regenerate connection strings in Vercel Postgres
- Update environment variables
- Redeploy

### Issue: File Upload Fails

**Check:**
1. `BLOB_READ_WRITE_TOKEN` is set correctly
2. File size is under 100MB
3. User account status is "active"

**Debug:**
- Check Vercel logs: `vercel logs --follow`
- Check browser console for errors
- Verify folder permissions in database

### Issue: "Invalid or expired invite link"

**Check:**
1. Token hasn't expired (7 days)
2. Account hasn't already been activated
3. Token exists in database

**Fix:**
```sql
-- Check token status
SELECT email, username, invite_expires, is_activated
FROM users
WHERE invite_token = 'YOUR_TOKEN';

-- Extend expiration if needed
UPDATE users
SET invite_expires = NOW() + INTERVAL '7 days'
WHERE invite_token = 'YOUR_TOKEN';
```

### Issue: Can't Login After Activation

**Check:**
1. Account was activated successfully (`is_activated = true`)
2. Username is correct (case-sensitive)
3. Password was set correctly

**Reset password manually:**
```sql
-- Generate new invite token
UPDATE users
SET invite_token = 'reset-password-123',
    invite_expires = NOW() + INTERVAL '1 day'
WHERE username = 'USERNAME';
```

Then go to: `/activate?token=reset-password-123`

### Issue: Past Due Account Still Has Access

**Check:**
```sql
SELECT c.company_name, c.account_status, u.username
FROM users u
JOIN companies c ON u.company_id = c.id
WHERE u.username = 'USERNAME';
```

Restrictions should appear immediately after updating `account_status`. Try:
1. Logout and login again
2. Clear browser cache
3. Check session is using latest company status

---

## 📞 Support & Resources

### Documentation
- **Next.js**: https://nextjs.org/docs
- **NextAuth**: https://next-auth.js.org/
- **Vercel Postgres**: https://vercel.com/docs/storage/vercel-postgres
- **Vercel Blob**: https://vercel.com/docs/storage/vercel-blob
- **Resend**: https://resend.com/docs

### Monitoring Tools
- Vercel Dashboard: https://vercel.com/dashboard
- Resend Dashboard: https://resend.com/emails
- Database Query: Vercel → Storage → Postgres → Query

### Getting Help
- Vercel Support: https://vercel.com/support
- Resend Support: support@resend.com
- Check application logs: `vercel logs`

---

## ✅ Post-Deployment Checklist

After completing all steps, verify:

- [ ] Application deploys successfully
- [ ] Database tables are created
- [ ] Blob storage is configured
- [ ] Email sending works
- [ ] Admin account can login
- [ ] Can create new users
- [ ] Invite emails are received
- [ ] Customer can activate account
- [ ] Customer can login
- [ ] File upload works
- [ ] File download works
- [ ] Access control works (customers only see their folders)
- [ ] Payment restriction works (past_due blocks access)
- [ ] Audit logging works
- [ ] Custom domain is configured (if applicable)
- [ ] SSL certificate is active
- [ ] Monitoring is enabled

---

## 🎯 Next Steps

Your portal is now live! Consider these enhancements:

1. **Add 2FA** for admin accounts
2. **Implement virus scanning** for uploaded files
3. **Set up automated backups** to external storage
4. **Create admin tools** for managing files
5. **Add usage analytics** for customers
6. **Implement file versioning**
7. **Add bulk file operations**
8. **Create mobile-responsive improvements**

---

## 📄 License

Proprietary - M2 Reporter

## 🏆 Credits

Built for M2Reporter.com - Metro 2 Made Simple
