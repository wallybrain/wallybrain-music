import type { Handle } from '@sveltejs/kit';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from '$lib/server/db/client';
import { startQueueProcessor } from '$lib/server/queue';

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

	// Auth guard: admin pages verified via Authelia, API writes just need a valid session cookie
	if (pathname.startsWith('/admin')) {
		const session = event.cookies.get('authelia_session');
		if (!session) {
			return new Response('Unauthorized', { status: 401 });
		}

		try {
			const cookieHeader = event.request.headers.get('cookie') || '';
			const res = await fetch('http://authelia:9091/api/verify', {
				method: 'GET',
				headers: {
					Cookie: cookieHeader,
					'X-Original-URL': `https://wallybrain.icu${pathname}`,
				},
			});

			if (res.status !== 200) {
				return new Response('Unauthorized', { status: 401 });
			}
		} catch {
			return new Response('Auth service unavailable', { status: 503 });
		}
	} else if (pathname.startsWith('/api/') && method !== 'GET') {
		// API writes: require session cookie (CSRF origin check above provides additional protection)
		const session = event.cookies.get('authelia_session');
		if (!session) {
			return new Response('Unauthorized', { status: 401 });
		}
	}

	return resolve(event);
};
