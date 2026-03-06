// Frontend utilities for Stripe billing

/**
 * Start a Stripe Checkout session
 * @param {string} plan - Plan tier (basic, pro, elite)
 * @returns {Promise<void>} - Redirects to Stripe checkout
 */
export async function startCheckout(plan) {
  try {
    console.log(`🛒 Starting checkout for plan: ${plan}`);
    
    const response = await fetch('/functions/createCheckoutSession', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ plan })
    });

    // Check Content-Type before parsing
    const contentType = response.headers.get('content-type') || '';
    const rawText = await response.text();
    
    if (!contentType.includes('application/json')) {
      console.error('❌ Expected JSON, got:', contentType);
      console.error('📄 Response snippet:', rawText.slice(0, 180));
      throw new Error(`Server error: Expected JSON response but got ${contentType}. Please contact us.`);
    }

    // Parse JSON
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      console.error('📄 Raw response:', rawText);
      throw new Error('Server returned invalid response. Please try again or contact us.');
    }

    // Check for errors
    if (!response.ok || data.error) {
      console.error('❌ Checkout error:', data);
      throw new Error(data.details || data.error || 'Failed to create checkout session. Please try again.');
    }

    console.log('✅ Checkout session created');

    // Redirect to Stripe checkout
    if (data.url) {
      console.log('🔗 Redirecting to:', data.url);
      window.location.assign(data.url);
      return;
    }

    throw new Error('No checkout URL returned from server. Please try again.');

  } catch (error) {
    console.error('❌ startCheckout failed:', error);
    throw error;
  }
}

/**
 * Track successful checkout completion
 * @param {string} sessionId - Stripe session ID
 */
export function handleCheckoutSuccess(sessionId) {
  console.log('✅ Checkout success:', sessionId);
  
  // Track with analytics if available
  if (window.lgb?.track) {
    window.lgb.track('checkout_completed', { 
      session_id: sessionId,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Open Stripe Customer Portal
 * @returns {Promise<void>} - Redirects to Stripe portal
 */
export async function openCustomerPortal() {
  try {
    console.log('🏛️ Opening customer portal...');
    
    const response = await fetch('/functions/createPortalSession', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const contentType = response.headers.get('content-type') || '';
    const rawText = await response.text();
    
    if (!contentType.includes('application/json')) {
      console.error('❌ Expected JSON, got:', contentType);
      throw new Error(`Server error: Expected JSON response but got ${contentType}.`);
    }

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      throw new Error('Server returned invalid response.');
    }

    if (!response.ok || data.error) {
      console.error('❌ Portal error:', data);
      throw new Error(data.details || data.error || 'Failed to open billing portal.');
    }

    console.log('✅ Portal session created');

    if (data.url) {
      console.log('🔗 Redirecting to portal:', data.url);
      window.location.assign(data.url);
      return;
    }

    throw new Error('No portal URL returned from server.');

  } catch (error) {
    console.error('❌ openCustomerPortal failed:', error);
    throw error;
  }
}