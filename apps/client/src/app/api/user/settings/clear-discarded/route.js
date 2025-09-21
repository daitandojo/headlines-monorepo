// apps/client/src/app/api/user/settings/clear-discarded/route.js (NEW FILE)
import { NextResponse } from 'next/server';
import { clearDiscardedItems } from '@headlines/data-access';
import { verifySession } from '@headlines/auth';

export async function POST(request) {
  const { user, error } = await verifySession();
  if (!user) {
    return NextResponse.json({ error: error || 'Authentication required' }, { status: 401 });
  }
  
  try {
    const result = await clearDiscardedItems(user.userId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, message: result.message });
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}