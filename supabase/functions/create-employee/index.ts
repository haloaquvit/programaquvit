import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, password, full_name, role, phone, address, status } = await req.json()

    if (!email || !password || !full_name || !role) {
      throw new Error("Email, password, full name, and role are required.")
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Step 1: Create the user in auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name,
        role,
      }
    })

    if (authError) {
      throw authError
    }

    if (!authData.user) {
        throw new Error("User creation failed, user data not returned.")
    }

    const user = authData.user

    // Step 2: Insert the profile into public.profiles
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
        full_name: full_name,
        role: role,
        phone: phone,
        address: address,
        status: status,
      })

    if (profileError) {
      // If profile creation fails, delete the auth user to keep things consistent.
      await supabaseAdmin.auth.admin.deleteUser(user.id)
      throw new Error(`Failed to create profile: ${profileError.message}`)
    }

    return new Response(JSON.stringify({ user: authData.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})