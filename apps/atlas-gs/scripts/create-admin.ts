import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import * as readline from 'readline'

const prisma = new PrismaClient()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve)
  })
}

async function main() {
  console.log('🔐 Create Admin Account\n')

  const name = await question('Enter admin name: ')
  const email = await question('Enter admin email: ')
  const password = await question('Enter admin password: ')

  if (!name || !email || !password) {
    console.error('❌ All fields are required!')
    process.exit(1)
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  })

  if (existingUser) {
    console.error('❌ User with this email already exists!')
    process.exit(1)
  }

  // Create admin user
  const hashedPassword = await bcrypt.hash(password, 10)
  
  const admin = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: 'ADMIN',
    },
  })

  console.log('\n✅ Admin account created successfully!')
  console.log(`   Name: ${admin.name}`)
  console.log(`   Email: ${admin.email}`)
  console.log(`   Role: ${admin.role}`)
  console.log('\n🚀 You can now log in at http://localhost:3000')

  rl.close()
}

main()
  .catch((e) => {
    console.error('❌ Error:', e.message)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
