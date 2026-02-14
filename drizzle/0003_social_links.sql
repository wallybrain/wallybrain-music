CREATE TABLE `social_links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`platform` text NOT NULL,
	`url` text NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL
);

-- Seed initial social links
INSERT INTO `social_links` (`platform`, `url`, `display_order`) VALUES
	('SoundCloud', 'https://soundcloud.com/wallybrain', 1),
	('Spotify', 'https://open.spotify.com/artist/1cH9oEsv4l65i078NolWil?si=whSFmKl2Tae1PF2mhar7IA', 2),
	('Bandcamp', 'https://wallybrain.bandcamp.com/music', 3);
