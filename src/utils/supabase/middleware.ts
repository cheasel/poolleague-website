import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const { pathname } = request.nextUrl
  const isAdminPage = pathname.startsWith('/admin')
  const isLoginPage = pathname === '/login'

  // OPTIMIZATION: Skip Supabase auth entirely for public routes.
  // The getUser() call makes an external HTTP request to Supabase auth servers,
  // which adds latency and can hang on slow mobile connections. Public pages
  // (standings, players, teams, matches) don't need authentication at all.
  if (!isAdminPage && !isLoginPage) {
    return supabaseResponse
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !anonKey) {
    if (isAdminPage || isLoginPage) {
      console.warn("Supabase environment variables are missing (URL or Anon Key). Skipping auth updates.");
    }

    // Protect /admin routes: if trying to access admin without env variables, redirect to login
    if (isAdminPage) {
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

    // Refresh the session — this is the critical call (only for admin/login routes)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Protect /admin routes: redirect unauthenticated users to /login
    if (isAdminPage) {
      if (!user) {
        const loginUrl = request.nextUrl.clone()
        loginUrl.pathname = '/login'
        loginUrl.searchParams.set('redirectTo', pathname)
        
        const response = NextResponse.redirect(loginUrl)
        supabaseResponse.cookies.getAll().forEach((cookie) => {
          response.cookies.set(cookie.name, cookie.value, cookie)
        })
        return response
      }
    }

    // If authenticated user visits /login, redirect them to /admin
    if (isLoginPage && user) {
      const adminUrl = request.nextUrl.clone()
      adminUrl.pathname = '/admin'
      
      const response = NextResponse.redirect(adminUrl)
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        response.cookies.set(cookie.name, cookie.value, cookie)
      })
      return response
    }
  } catch (error) {
    console.error("Supabase updateSession failed:", error)
    // For safety, if it fails on an admin page, redirect to login. For public, let it pass.
    if (isAdminPage) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      return NextResponse.redirect(loginUrl)
    }
  }

  return supabaseResponse
}
