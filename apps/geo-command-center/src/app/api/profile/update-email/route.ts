import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { email, currentPassword } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      )
    }

    if (!currentPassword) {
      return NextResponse.json(
        { error: 'Current password is required to change email' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get the current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify the current password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    })

    if (signInError) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      )
    }

    // Update the user's email (this will send a confirmation email)
    const { error } = await supabase.auth.updateUser({
      email: email.trim(),
    })

    if (error) {
      console.error('Error updating email:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to update email' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: 'Confirmation email sent. Please check your inbox to verify your new email address.'
    })
  } catch (error) {
    console.error('Error in update email:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
