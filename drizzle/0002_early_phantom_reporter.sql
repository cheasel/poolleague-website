ALTER TABLE "divisions" ALTER COLUMN "name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "divisions" ADD COLUMN "season_id" integer;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "division_id" integer;--> statement-breakpoint
ALTER TABLE "divisions" ADD CONSTRAINT "divisions_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;