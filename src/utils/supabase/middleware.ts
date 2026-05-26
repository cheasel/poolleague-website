import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !anonKey) {
    console.warn("Supabase environment variables are missing (URL or Anon Key). Skipped auth update session check.")
    
    // Protect /admin routes: if trying to access admin without env variables, redirect to login
    if (request.nextUrl.pathname.startsWith('/admin')) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      return NextResponse.redirect(loginUrl)
    }
    return supabaseResponse
  }

  try {
    const supabase = createServerClient(
      url,
      anonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // Refresh the session — this is the critical call
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Protect /admin routes: redirect unauthenticated users to /login
    if (request.nextUrl.pathname.startsWith('/admin')) {
      if (!user) {
        const loginUrl = request.nextUrl.clone()
        loginUrl.pathname = '/login'
        loginUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
        return NextResponse.redirect(loginUrl)
      }
    }

    // If authenticated user visits /login, redirect them to /admin
    if (request.nextUrl.pathname === '/login' && user) {
      const adminUrl = request.nextUrl.clone()
      adminUrl.pathname = '/admin'
      return NextResponse.redirect(adminUrl)
    }
  } catch (error) {
    console.error("Supabase updateSession failed:", error)
    // For safety, if it fails on an admin page, redirect to login. For public, let it pass.
    if (request.nextUrl.pathname.startsWith('/admin')) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      return NextResponse.redirect(loginUrl)
    }
  }

  return supabaseResponse
}
