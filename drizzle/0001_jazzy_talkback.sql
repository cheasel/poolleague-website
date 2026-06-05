CREATE TYPE "public"."game_type" AS ENUM('single', 'double');--> statement-breakpoint
CREATE TABLE "team_registrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"season_id" integer NOT NULL,
	"division_id" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "players" DROP CONSTRAINT "players_team_id_teams_id_fk";
--> statement-breakpoint
ALTER TABLE "team_memberships" DROP CONSTRAINT "team_memberships_player_id_players_id_fk";
--> statement-breakpoint
ALTER TABLE "team_memberships" DROP CONSTRAINT "team_memberships_team_id_teams_id_fk";
--> statement-breakpoint
ALTER TABLE "team_memberships" DROP CONSTRAINT "team_memberships_season_id_seasons_id_fk";
--> statement-breakpoint
ALTER TABLE "team_memberships" DROP CONSTRAINT "team_memberships_division_id_divisions_id_fk";
--> statement-breakpoint
ALTER TABLE "teams" DROP CONSTRAINT "teams_division_id_divisions_id_fk";
--> statement-breakpoint
ALTER TABLE "match_games" ALTER COLUMN "match_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "match_games" ALTER COLUMN "game_type" SET DEFAULT 'single'::"public"."game_type";--> statement-breakpoint
ALTER TABLE "match_games" ALTER COLUMN "game_type" SET DATA TYPE "public"."game_type" USING "game_type"::"public"."game_type";--> statement-breakpoint
ALTER TABLE "match_games" ALTER COLUMN "game_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "match_games" ALTER COLUMN "player1_score" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "match_games" ALTER COLUMN "player2_score" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "match_games" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ALTER COLUMN "status" SET DEFAULT 'scheduled'::"public"."match_status";--> statement-breakpoint
ALTER TABLE "matches" ALTER COLUMN "status" SET DATA TYPE "public"."match_status" USING "status"::"public"."match_status";--> statement-breakpoint
ALTER TABLE "matches" ALTER COLUMN "status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ALTER COLUMN "season_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ALTER COLUMN "division_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "role" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "seasons" ALTER COLUMN "is_active" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "team_memberships" ALTER COLUMN "player_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "team_memberships" ALTER COLUMN "team_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "team_memberships" ALTER COLUMN "season_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "team_memberships" ALTER COLUMN "is_captain" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "venues" ALTER COLUMN "is_active" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "team_registrations" ADD CONSTRAINT "team_registrations_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_registrations" ADD CONSTRAINT "team_registrations_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_registrations" ADD CONSTRAINT "team_registrations_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "team_registrations_team_idx" ON "team_registrations" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "team_registrations_season_division_idx" ON "team_registrations" USING btree ("season_id","division_id");--> statement-breakpoint
CREATE UNIQUE INDEX "team_season_reg_idx" ON "team_registrations" USING btree ("team_id","season_id");--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_away_team_id_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_home_venue_id_venues_id_fk" FOREIGN KEY ("home_venue_id") REFERENCES "public"."venues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "divisions_season_idx" ON "divisions" USING btree ("season_id");--> statement-breakpoint
CREATE INDEX "match_games_match_idx" ON "match_games" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "match_games_player1_idx" ON "match_games" USING btree ("player1_id");--> statement-breakpoint
CREATE INDEX "match_games_player1_partner_idx" ON "match_games" USING btree ("player1_partner_id");--> statement-breakpoint
CREATE INDEX "match_games_player2_idx" ON "match_games" USING btree ("player2_id");--> statement-breakpoint
CREATE INDEX "match_games_player2_partner_idx" ON "match_games" USING btree ("player2_partner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "match_game_order_idx" ON "match_games" USING btree ("match_id","game_order");--> statement-breakpoint
CREATE INDEX "matches_season_division_date_idx" ON "matches" USING btree ("season_id","division_id","date");--> statement-breakpoint
CREATE INDEX "matches_home_team_idx" ON "matches" USING btree ("home_team_id");--> statement-breakpoint
CREATE INDEX "matches_away_team_idx" ON "matches" USING btree ("away_team_id");--> statement-breakpoint
CREATE INDEX "matches_status_idx" ON "matches" USING btree ("status");--> statement-breakpoint
CREATE INDEX "team_memberships_player_idx" ON "team_memberships" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "team_memberships_team_idx" ON "team_memberships" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "team_memberships_season_division_idx" ON "team_memberships" USING btree ("season_id","division_id");--> statement-breakpoint
CREATE INDEX "team_memberships_team_season_idx" ON "team_memberships" USING btree ("team_id","season_id");--> statement-breakpoint
CREATE UNIQUE INDEX "player_season_membership_idx" ON "team_memberships" USING btree ("player_id","season_id");--> statement-breakpoint
CREATE INDEX "teams_home_venue_idx" ON "teams" USING btree ("home_venue_id");--> statement-breakpoint
ALTER TABLE "players" DROP COLUMN "team_id";--> statement-breakpoint
ALTER TABLE "teams" DROP COLUMN "division_id";--> statement-breakpoint
ALTER TABLE "teams" DROP COLUMN "points";--> statement-breakpoint
ALTER TABLE "teams" DROP COLUMN "sets_won";--> statement-breakpoint
ALTER TABLE "teams" DROP COLUMN "sets_lost";