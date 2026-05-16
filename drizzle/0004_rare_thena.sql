ALTER TABLE "players" DROP CONSTRAINT "players_team_id_teams_id_fk";
--> statement-breakpoint
ALTER TABLE "players" ALTER COLUMN "name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" DROP COLUMN "handicap";