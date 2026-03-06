# Stripe Integration - Quick Answer

## TL;DR - What You Need

To connect Stripe and receive payments, you need **2 things**:

### 1. **Secret Key** 
```bash
STRIPE_SECRET_KEY=sk_test_51ABC123...
```
**Where to get it**: Stripe Dashboard → Developers → API keys

### 2. **Webhook Secret**
```bash
STRIPE_WEBHOOK_SECRET=whsec_abc123...
```
**Where to get it**: 
- **Local dev**: Run `stripe listen --forward-to localhost:3001/api/stripe/webhook`
- **Production**: Stripe Dashboard → Developers → Webhooks → Add endpoint

---

## 5-Minute Setup

```bash
# 1. Install Stripe CLI (macOS)
brew install stripe/stripe-cli/stripe

# 2. Login to Stripe
stripe login

# 3. Start webhook forwarding (leave this running)
stripe listen --forward-to localhost:3001/api/stripe/webhook
# Copy the whsec_... that appears

# 4. Add to .env.local
echo "STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE" >> .env.local
echo "STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE" >> .env.local

# 5. Restart server
npm run dev

# 6. Test it (in another terminal)
stripe trigger payment_intent.succeeded

# 7. Check Supabase payments table - should see a record!
```

---

## What Happens After Setup

Once connected, your app automatically:

✅ **Tracks all payments** in your database  
✅ **Records subscription changes** (new, canceled, updated)  
✅ **Calculates MRR** (Monthly Recurring Revenue)  
✅ **Shows revenue metrics** on dashboard  
✅ **Syncs payment data** to Supabase in real-time  

---

## Need More Details?

See these guides in your project:

1. **[STRIPE_QUICK_START.md](./STRIPE_QUICK_START.md)** - Checklist format
2. **[STRIPE_SETUP_GUIDE.md](./STRIPE_SETUP_GUIDE.md)** - Complete walkthrough
3. **[STRIPE_VISUAL_GUIDE.md](./STRIPE_VISUAL_GUIDE.md)** - Visual diagrams

---

## Test Cards

```
Success:  4242 4242 4242 4242
Decline:  4000 0000 0000 0002
3D Auth:  4000 0025 0000 3155

Exp: 12/34  |  CVC: 123  |  ZIP: 12345
```

---

## Common Questions

**Q: Do I need a business to use Stripe?**  
A: No! You can start in Test Mode immediately without business verification.

**Q: When do I switch to Live Mode?**  
A: After you've tested thoroughly and completed Stripe's business verification.

**Q: Do I need to create products in Stripe?**  
A: Only if you want to charge subscriptions. For one-time payments, just the API keys are enough.

**Q: Will this charge real money?**  
A: Not in Test Mode (keys start with `sk_test_...`). Test mode uses fake card numbers.

**Q: How do I know it's working?**  
A: After running `stripe trigger payment_intent.succeeded`, check your Supabase `payments` table for a new record.

---

That's it! 🎉 Get your 2 keys, add them to `.env.local`, restart the server, and you're ready to accept payments.
