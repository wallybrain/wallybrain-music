import type { Handle } from '@sveltejs/kit';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from '$lib/server/db/client';
import { startQueueProcessor } from '$lib/server/queue';
import { verifyAutheliaSession } from '$lib/server/security';

migrate(db, { migrationsFolder: './drizzle' });
startQueueProcessor();

const ALLOWED_ORIGINS = new Set([
	'https://wallybrain.icu',
	'https://wallyblanchard.com',
]);

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;
	const method = event.request.method;

	// Health check is always public
	if (pathname === '/health') {
		return resolve(event);
	}

	// CSRF protection for state-changing API requests
	if (pathname.startsWith('/api/') && method !== 'GET' && method !== 'HEAD') {
		const origin = event.request.headers.get('origin');
		if (origin && !ALLOWED_ORIGINS.has(origin)) {
			return new Response('Forbidden', { status: 403 });
		}
	}

	// Auth guard: both admin pages and API writes verified via Authelia
	if (pathname.startsWith('/admin') || (pathname.startsWith('/api/') && method !== 'GET' && method !== 'HEAD')) {
		const session = event.cookies.get('authelia_session');
		if (!session) {
			return new Response('Unauthorized', { status: 401 });
		}

		const cookieHeader = event.request.headers.get('cookie') || '';
		const valid = await verifyAutheliaSession(cookieHeader, `https://wallybrain.icu${pathname}`);
		if (!valid) {
			return new Response('Unauthorized', { status: 401 });
		}
	}

	return resolve(event);
};
