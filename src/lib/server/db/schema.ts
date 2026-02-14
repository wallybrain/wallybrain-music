import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, primaryKey } from 'drizzle-orm/sqlite-core';

export const collections = sqliteTable('collections', {
  id: text('id').primaryKey().notNull(),
  slug: text('slug').unique().notNull(),
  title: text('title').notNull(),
  description: text('description'),
  type: text('type', { enum: ['album', 'playlist', 'single'] }).notNull(),
  artist: text('artist'),
  artPath: text('art_path'),
  dominantColor: text('dominant_color'),
  sortOrder: integer('sort_order').default(0).notNull(),
  trackCount: integer('track_count').default(0).notNull(),
  totalDuration: integer('total_duration').default(0).notNull(),
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`),
  updatedAt: text('updated_at').notNull().default(sql`(current_timestamp)`),
});

export const tracks = sqliteTable('tracks', {
  id: text('id').primaryKey().notNull(),
  slug: text('slug').unique().notNull(),
  title: text('title').notNull(),
  description: text('description'),
  duration: integer('duration', { mode: 'number' }),
  bitrate: integer('bitrate'),
  fileSize: integer('file_size'),
  originalFilename: text('original_filename'),
  audioPath: text('audio_path').notNull(),
  peaksPath: text('peaks_path'),
  artPath: text('art_path'),
  dominantColor: text('dominant_color'),
  artThumb: text('art_thumb'),
  errorMessage: text('error_message'),
  category: text('category', {
    enum: ['track', 'set', 'experiment', 'export', 'album', 'playlist']
  }).default('track').notNull(),
  status: text('status', {
    enum: ['pending', 'processing', 'ready', 'failed']
  }).default('pending').notNull(),
  playCount: integer('play_count').default(0).notNull(),
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`),
  updatedAt: text('updated_at').notNull().default(sql`(current_timestamp)`),
});

export const tags = sqliteTable('tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').unique().notNull(),
});

export const trackTags = sqliteTable('track_tags', {
  trackId: text('track_id').notNull().references(() => tracks.id, { onDelete: 'cascade' }),
  tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.trackId, table.tagId] }),
}));

export const collectionTracks = sqliteTable('collection_tracks', {
  collectionId: text('collection_id').notNull().references(() => collections.id, { onDelete: 'cascade' }),
  trackId: text('track_id').notNull().references(() => tracks.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.collectionId, table.trackId] }),
}));

export const socialLinks = sqliteTable('social_links', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  platform: text('platform').notNull(),
  url: text('url').notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
});
