// src/app/admin/page.js (version 1.0)
import { redirect } from 'next/navigation'

/**
 * The default page for the /admin route.
 * It immediately redirects the user to the '/admin/users' view,
 * which is the default landing page for the admin command center.
 */
export default function AdminRootPage() {
  redirect('/admin/users')
}
