import { pgTable, serial, text, integer, varchar, timestamp, boolean, uuid, doublePrecision, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Enums for type safety
export const roleEnum = pgEnum('role', ['admin', 'captain', 'viewer']);
export const matchStatusEnum = pgEnum('match_status', ['scheduled', 'live', 'completed', 'cancelled']);

// 2. Core Tables
export const venues = pgTable('venues', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address'),
  isActive: boolean('is_active').default(true),
});

export const seasons = pgTable('seasons', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  isActive: boolean('is_active').default(true),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
});

export const divisions = pgTable('divisions', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
});

export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  homeVenueId: integer('home_venue_id').references(() => venues.id),
  isActive: boolean('is_active').default(true),
});

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  handicap: integer("handicap").default(0),
  teamId: integer("team_id").references(() => teams.id), // Link to a team
});

// 3. The Flexible Membership Table (Multi-team advice)
export const teamMemberships = pgTable('team_memberships', {
  id: serial('id').primaryKey(),
  playerId: integer('player_id').references(() => players.id),
  teamId: integer('team_id').references(() => teams.id),
  seasonId: integer('season_id').references(() => seasons.id),
  divisionId: integer('division_id').references(() => divisions.id),
  isCaptain: boolean('is_captain').default(false),
});

// 4. Match & Scoring Tables
export const matches = pgTable('matches', {
  id: serial('id').primaryKey(),
  seasonId: integer('season_id').references(() => seasons.id),
  divisionId: integer('division_id').references(() => divisions.id),
  homeTeamId: integer('home_team_id').references(() => teams.id),
  awayTeamId: integer('away_team_id').references(() => teams.id),
  homeTeamScoreTotal: integer('home_team_score_total').default(0),
  awayTeamScoreTotal: integer('away_team_score_total').default(0),
  matchDate: timestamp('match_date'),
  status: matchStatusEnum('status').default('scheduled'),
});

export const matchGames = pgTable("match_games", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").references(() => matches.id, { onDelete: "cascade" }),
  gameOrder: integer("game_order").notNull(),
  gameType: varchar("game_type", { length: 20 }).default("single"), // 'single' or 'double'
  
  // Home Side
  player1Id: integer("player1_id").references(() => players.id),
  player1PartnerId: integer("player1_partner_id").references(() => players.id),
  
  // Away Side
  player2Id: integer("player2_id").references(() => players.id),
  player2PartnerId: integer("player2_partner_id").references(() => players.id),
  
  player1Score: integer("player1_score").default(0),
  player2Score: integer("player2_score").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// 5. Auth Profiles
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  email: text('email').unique().notNull(),
  role: roleEnum('role').default('viewer'),
  createdAt: timestamp('created_at').defaultNow(),
});