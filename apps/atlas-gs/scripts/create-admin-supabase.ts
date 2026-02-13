/**
 * Creates an admin user in Supabase Auth + profiles (shared with GEO Command Center).
 * Also creates/links Prisma User for Atlas GS business data.
 * Run: npx tsx scripts/create-admin-supabase.ts
 */
import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'
import * as readline from 'readline'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const prisma = new PrismaClient()

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (q: string) => new Promise<string>((r) => rl.question(q, r))

async function main() {
  console.log('🔐 Create Admin Account (Supabase + Atlas + GEO Command Center)\n')

  const name = await question('Enter admin name: ')
  const email = await question('Enter admin email: ')
  const password = await question('Enter admin password: ')

  if (!name || !email || !password) {
    console.error('❌ All fields are required!')
    process.exit(1)
  }

  const { data: existing } = await supabase.auth.admin.listUsers()
  const exists = existing?.users?.some((u) => u.email === email)
  if (exists) {
    console.error('❌ User with this email already exists in Supabase!')
    process.exit(1)
  }

  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  })

  if (authError || !authUser.user) {
    console.error('❌ Supabase error:', authError?.message)
    process.exit(1)
  }

  await supabase.from('profiles').upsert({
    id: authUser.user.id,
    role: 'admin',
    full_name: name,
  }, { onConflict: 'id' })

  const prismaUser = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name,
      password: 'supabase-auth',
      supabaseUserId: authUser.user.id,
      role: 'ADMIN',
    },
    update: {
      supabaseUserId: authUser.user.id,
      role: 'ADMIN',
    },
  })

  console.log('\n✅ Admin account created successfully!')
  console.log(`   Name: ${name}`)
  console.log(`   Email: ${email}`)
  console.log(`   Role: ADMIN`)
  console.log('\n🚀 Use these credentials for BOTH:')
  console.log('   - Atlas GS: http://localhost:3000')
  console.log('   - GEO Command Center: http://localhost:3001')
  rl.close()
}

main()
  .catch((e) => {
    console.error('❌ Error:', e.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
