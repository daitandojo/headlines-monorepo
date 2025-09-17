import { redirect } from 'next/navigation';

/**
 * This is the default page for the root route ('/').
 * It immediately redirects the user to the '/events' view,
 * which is the default landing page for the application.
 */
export default function RootPage() {
  redirect('/events');
}