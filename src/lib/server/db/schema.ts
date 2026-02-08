import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, primaryKey } from 'drizzle-orm/sqlite-core';

export const tracks = sqliteTable('tracks', {
  id: text('id').primaryKey().notNull(),
  slug: text('slug').unique().notNull(),
  title: text('title').notNull(),
  description: text('description'),
  duration: integer('duration', { mode: 'number' }),
  bitrate: integer('bitrate'),
  fileSize: integer('file_size'),
  audioPath: text('audio_path').notNull(),
  peaksPath: text('peaks_path'),
  artPath: text('art_path'),
  artThumb: text('art_thumb'),
  category: text('category', {
    enum: ['track', 'set', 'experiment', 'export']
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
