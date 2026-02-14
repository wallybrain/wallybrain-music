import { db } from '$lib/server/db/client';
import { socialLinks } from '$lib/server/db/schema';
import { asc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const links = db
		.select()
		.from(socialLinks)
		.orderBy(asc(socialLinks.displayOrder))
		.all();

	return { socialLinks: links };
};
