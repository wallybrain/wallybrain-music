import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies }) => {
	const session = cookies.get('authelia_session');
	if (!session) return { isAuthenticated: false };

	try {
		const res = await fetch('http://authelia:9091/api/verify', {
			method: 'GET',
			headers: {
				Cookie: `authelia_session=${session}`,
				'X-Original-URL': 'https://wallybrain.icu/admin',
			},
		});
		return { isAuthenticated: res.status === 200 };
	} catch {
		return { isAuthenticated: false };
	}
};
