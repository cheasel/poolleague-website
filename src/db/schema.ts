import { pgTable, serial, text, integer, varchar, timestamp, boolean, uuid, pgEnum, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// 1. Enums for type safety
export const roleEnum = pgEnum('role', ['admin', 'captain', 'viewer']);
export const matchStatusEnum = pgEnum('match_status', ['scheduled', 'live', 'completed', 'cancelled']);
export const gameTypeEnum = pgEnum('game_type', ['single', 'double']);

// 2. Core Tables
export const venues = pgTable('venues', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(), // Removed standard .unique()
  address: text('address'),
  isActive: boolean('is_active').default(true).notNull(),
}, (table) => [
  // 🎯 Hard database-level restriction enforcing genuine lowercase uniqueness ("Omg" === "OMG")
  uniqueIndex('venues_name_lower_idx').on(sql`lower(${table.name})`)
]);

export const seasons = pgTable('seasons', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
});

export const divisions = pgTable("divisions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  seasonId: integer("season_id").references(() => seasons.id, { onDelete: "cascade" }),
  tier: integer("tier").default(1).notNull(), 
}, (table) => [
  index('divisions_season_idx').on(table.seasonId),
]);

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  homeVenueId: integer("home_venue_id").references(() => venues.id, { onDelete: "set null" }), 
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index('teams_home_venue_idx').on(table.homeVenueId),
]);

export const teamRegistrations = pgTable("team_registrations", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").references(() => teams.id, { onDelete: "cascade" }).notNull(),
  seasonId: integer("season_id").references(() => seasons.id, { onDelete: "cascade" }).notNull(),
  divisionId: integer("division_id").references(() => divisions.id, { onDelete: "cascade" }).notNull(),
}, (table) => [
  index('team_registrations_team_idx').on(table.teamId),
  index('team_registrations_season_division_idx').on(table.seasonId, table.divisionId),
  uniqueIndex('team_season_reg_idx').on(table.teamId, table.seasonId),
]);

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  imageUrl: text("image_url"), 
});

// 3. The Flexible Membership Table
export const teamMemberships = pgTable('team_memberships', {
  id: serial('id').primaryKey(),
  playerId: integer('player_id').references(() => players.id, { onDelete: "cascade" }).notNull(),
  teamId: integer('team_id').references(() => teams.id, { onDelete: "cascade" }).notNull(),
  seasonId: integer('season_id').references(() => seasons.id, { onDelete: "cascade" }).notNull(),
  divisionId: integer('division_id').references(() => divisions.id, { onDelete: "cascade" }),
  isCaptain: boolean('is_captain').default(false).notNull(),
}, (table) => [
  index('team_memberships_player_idx').on(table.playerId),
  index('team_memberships_team_idx').on(table.teamId),
  index('team_memberships_season_division_idx').on(table.seasonId, table.divisionId),
  index('team_memberships_team_season_idx').on(table.teamId, table.seasonId),
  uniqueIndex('player_season_membership_idx').on(table.playerId, table.seasonId),
]);

// 4. Match & Scoring Tables
export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  date: timestamp("date"),
  status: matchStatusEnum("status").default("scheduled").notNull(), 
  weekNumber: integer("week_number").default(1).notNull(),
  homeTeamId: integer("home_team_id").references(() => teams.id, { onDelete: "set null" }),
  awayTeamId: integer("away_team_id").references(() => teams.id, { onDelete: "set null" }),
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
  seasonId: integer("season_id").references(() => seasons.id, { onDelete: "cascade" }).notNull(),
  divisionId: integer("division_id").references(() => divisions.id, { onDelete: "cascade" }).notNull(),
}, (table) => [
  index('matches_season_division_date_idx').on(table.seasonId, table.divisionId, table.date),
  index('matches_home_team_idx').on(table.homeTeamId),
  index('matches_away_team_idx').on(table.awayTeamId),
  index('matches_status_idx').on(table.status),
]);

export const matchGames = pgTable("match_games", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").references(() => matches.id, { onDelete: "cascade" }).notNull(),
  gameOrder: integer("game_order").notNull(),
  gameType: gameTypeEnum("game_type").default("single").notNull(), 
  player1Id: integer("player1_id").references(() => players.id),
  player1PartnerId: integer("player1_partner_id").references(() => players.id),
  player2Id: integer("player2_id").references(() => players.id),
  player2PartnerId: integer("player2_partner_id").references(() => players.id),
  player1Score: integer("player1_score").default(0).notNull(),
  player2Score: integer("player2_score").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index('match_games_match_idx').on(table.matchId),
  index('match_games_player1_idx').on(table.player1Id),
  index('match_games_player1_partner_idx').on(table.player1PartnerId),
  index('match_games_player2_idx').on(table.player2Id),
  index('match_games_player2_partner_idx').on(table.player2PartnerId),
  uniqueIndex('match_game_order_idx').on(table.matchId, table.gameOrder),
]);

// 5. Auth Profiles
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  email: text('email').unique().notNull(),
  role: roleEnum('role').default('viewer').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 6. Relations definitions for Drizzle ORM Relational Query API
export const seasonsRelations = relations(seasons, ({ many }) => ({
  divisions: many(divisions),
  matches: many(matches),
  teamRegistrations: many(teamRegistrations),
}));

export const divisionsRelations = relations(divisions, ({ one, many }) => ({
  season: one(seasons, { fields: [divisions.seasonId], references: [seasons.id] }),
  teamRegistrations: many(teamRegistrations),
  matches: many(matches),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  venue: one(venues, { fields: [teams.homeVenueId], references: [venues.id] }),
  homeMatches: many(matches, { relationName: "homeMatches" }),
  awayMatches: many(matches, { relationName: "awayMatches" }),
  registrations: many(teamRegistrations),
}));

export const teamRegistrationsRelations = relations(teamRegistrations, ({ one }) => ({
  team: one(teams, { fields: [teamRegistrations.teamId], references: [teams.id] }),
  season: one(seasons, { fields: [teamRegistrations.seasonId], references: [seasons.id] }),
  division: one(divisions, { fields: [teamRegistrations.divisionId], references: [divisions.id] }),
}));

export const venuesRelations = relations(venues, ({ many }) => ({
  teams: many(teams),
}));

export const playersRelations = relations(players, ({ many }) => ({
  memberships: many(teamMemberships),
  matchGamesAsPlayer1: many(matchGames, { relationName: "player1" }),
  matchGamesAsPlayer1Partner: many(matchGames, { relationName: "player1Partner" }),
  matchGamesAsPlayer2: many(matchGames, { relationName: "player2" }),
  matchGamesAsPlayer2Partner: many(matchGames, { relationName: "player2Partner" }),
}));

export const teamMembershipsRelations = relations(teamMemberships, ({ one }) => ({
  player: one(players, { fields: [teamMemberships.playerId], references: [players.id] }),
  team: one(teams, { fields: [teamMemberships.teamId], references: [teams.id] }),
  season: one(seasons, { fields: [teamMemberships.seasonId], references: [seasons.id] }),
  division: one(divisions, { fields: [teamMemberships.divisionId], references: [divisions.id] }),
}));

export const matchesRelations = relations(matches, ({ one, many }) => ({
  season: one(seasons, { fields: [matches.seasonId], references: [seasons.id] }),
  division: one(divisions, { fields: [matches.divisionId], references: [divisions.id] }),
  homeTeam: one(teams, { fields: [matches.homeTeamId], references: [teams.id], relationName: "homeMatches" }),
  awayTeam: one(teams, { fields: [matches.awayTeamId], references: [teams.id], relationName: "awayMatches" }),
  games: many(matchGames),
}));

export const matchGamesRelations = relations(matchGames, ({ one }) => ({
  match: one(matches, { fields: [matchGames.matchId], references: [matches.id] }),
  player1: one(players, { fields: [matchGames.player1Id], references: [players.id], relationName: "player1" }),
  player1Partner: one(players, { fields: [matchGames.player1PartnerId], references: [players.id], relationName: "player1Partner" }),
  player2: one(players, { fields: [matchGames.player2Id], references: [players.id], relationName: "player2" }),
  player2Partner: one(players, { fields: [matchGames.player2PartnerId], references: [players.id], relationName: "player2Partner" }),
}));