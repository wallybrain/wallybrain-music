import { db } from '$lib/server/db/client';
import { tracks, collections } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

const SITE = 'https://wallybrain.net';

export async function GET() {
	const allTracks = db
		.select({ slug: tracks.slug, updatedAt: tracks.updatedAt })
		.from(tracks)
		.where(eq(tracks.status, 'ready'))
		.all();

	const allCollections = db
		.select({ slug: collections.slug, updatedAt: collections.updatedAt })
		.from(collections)
		.all();

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${SITE}/about</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
${allCollections.map((c) => `  <url>
    <loc>${SITE}/collection/${c.slug}</loc>
    <lastmod>${c.updatedAt ? c.updatedAt.split(' ')[0] : ''}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('\n')}
${allTracks.map((t) => `  <url>
    <loc>${SITE}/track/${t.slug}</loc>
    <lastmod>${t.updatedAt ? t.updatedAt.split(' ')[0] : ''}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`).join('\n')}
</urlset>`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=3600'
		}
	});
}
