ALTER TABLE "matches" DROP CONSTRAINT "matches_season_id_seasons_id_fk";
--> statement-breakpoint
ALTER TABLE "matches" DROP CONSTRAINT "matches_division_id_divisions_id_fk";
--> statement-breakpoint
ALTER TABLE "matches" DROP CONSTRAINT "matches_home_team_id_teams_id_fk";
--> statement-breakpoint
ALTER TABLE "matches" DROP CONSTRAINT "matches_away_team_id_teams_id_fk";
--> statement-breakpoint
ALTER TABLE "matches" ALTER COLUMN "status" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "matches" ALTER COLUMN "status" SET DEFAULT 'scheduled';--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "date" timestamp;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "week_number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "home_score" integer;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "away_score" integer;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "matches" DROP COLUMN "home_team_score_total";--> statement-breakpoint
ALTER TABLE "matches" DROP COLUMN "away_team_score_total";--> statement-breakpoint
ALTER TABLE "matches" DROP COLUMN "match_date";