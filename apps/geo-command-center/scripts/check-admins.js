#!/usr/bin/env node

/**
 * Quick Admin Checker
 * 
 * This script helps you quickly view all admins in your system.
 * 
 * Usage:
 *   node scripts/check-admins.js
 * 
 * Or make it executable:
 *   chmod +x scripts/check-admins.js
 *   ./scripts/check-admins.js
 */

const https = require('https');

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function fetchAdmins() {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}/rest/v1/profiles?role=eq.admin&select=id,full_name,role,created_at`;
    
    const options = {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    };

    https.get(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function main() {
  log('\n🔍 Checking for admins in the system...\n', 'cyan');

  if (BASE_URL === 'YOUR_SUPABASE_URL' || ANON_KEY === 'YOUR_ANON_KEY') {
    log('❌ Error: Environment variables not set!', 'red');
    log('\nPlease set the following in your .env.local:', 'yellow');
    log('  NEXT_PUBLIC_SUPABASE_URL', 'yellow');
    log('  NEXT_PUBLIC_SUPABASE_ANON_KEY', 'yellow');
    process.exit(1);
  }

  try {
    const admins = await fetchAdmins();

    if (admins.length === 0) {
      log('⚠️  No admins found in the system!', 'yellow');
      log('\nTo create an admin, run this SQL in Supabase:', 'blue');
      log('  UPDATE profiles SET role = \'admin\' WHERE id = \'YOUR-USER-ID\';', 'cyan');
      process.exit(0);
    }

    log(`✅ Found ${admins.length} admin${admins.length === 1 ? '' : 's'}:\n`, 'green');

    admins.forEach((admin, index) => {
      log(`${index + 1}. ${admin.full_name || 'Unnamed Admin'}`, 'bright');
      log(`   ID: ${admin.id}`, 'blue');
      log(`   Created: ${new Date(admin.created_at).toLocaleDateString()}`, 'blue');
      log('');
    });

    log('💡 Tip: View detailed admin info at /dashboard/users', 'cyan');
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    log('\nTroubleshooting:', 'yellow');
    log('  1. Check your Supabase URL and API key', 'yellow');
    log('  2. Ensure RLS policies allow reading profiles', 'yellow');
    log('  3. Try running the SQL query directly in Supabase', 'yellow');
    process.exit(1);
  }
}

main();
