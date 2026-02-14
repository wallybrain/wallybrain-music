import { db } from '$lib/server/db/client';
import { socialLinks } from '$lib/server/db/schema';
import { asc, eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async () => {
	const links = db
		.select()
		.from(socialLinks)
		.orderBy(asc(socialLinks.displayOrder))
		.all();

	return { socialLinks: links };
};

export const actions: Actions = {
	add: async ({ request }) => {
		const formData = await request.formData();
		const platform = (formData.get('platform') as string)?.trim();
		const url = (formData.get('url') as string)?.trim();

		if (!platform || !url) {
			return fail(400, { error: 'Platform name and URL are required.' });
		}

		const maxOrder = db
			.select({ max: socialLinks.displayOrder })
			.from(socialLinks)
			.get();

		db.insert(socialLinks).values({
			platform,
			url,
			displayOrder: (maxOrder?.max ?? 0) + 1,
		}).run();

		return { success: true };
	},

	update: async ({ request }) => {
		const formData = await request.formData();
		const id = Number(formData.get('id'));
		const platform = (formData.get('platform') as string)?.trim();
		const url = (formData.get('url') as string)?.trim();

		if (!id || !platform || !url) {
			return fail(400, { error: 'All fields are required.' });
		}

		db.update(socialLinks)
			.set({ platform, url })
			.where(eq(socialLinks.id, id))
			.run();

		return { success: true };
	},

	delete: async ({ request }) => {
		const formData = await request.formData();
		const id = Number(formData.get('id'));

		if (!id) return fail(400, { error: 'Invalid link ID.' });

		db.delete(socialLinks).where(eq(socialLinks.id, id)).run();

		return { success: true };
	},

	reorder: async ({ request }) => {
		const formData = await request.formData();
		const orderJson = formData.get('order') as string;

		try {
			const order: number[] = JSON.parse(orderJson);
			for (let i = 0; i < order.length; i++) {
				db.update(socialLinks)
					.set({ displayOrder: i + 1 })
					.where(eq(socialLinks.id, order[i]))
					.run();
			}
		} catch {
			return fail(400, { error: 'Invalid order data.' });
		}

		return { success: true };
	},
};
