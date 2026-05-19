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

export const divisions = pgTable("divisions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  seasonId: integer("season_id").references(() => seasons.id, { onDelete: "cascade" }),
  // NEW: Explicit level mapping (1 = Top, 2 = Second, etc.)
  tier: integer("tier").default(1).notNull(), 
});

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  homeVenueId: integer("home_venue_id"), // Adjust based on your actual venue table
  divisionId: integer("division_id").references(() => divisions.id),
  
  // Add these columns for the leaderboard
  points: integer("points").default(0).notNull(),
  setsWon: integer("sets_won").default(0).notNull(),
  setsLost: integer("sets_lost").default(0).notNull(),
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  teamId: integer("team_id").references(() => teams.id, { onDelete: "set null" }),
  // NEW: Store the profile avatar image asset URL path
  imageUrl: text("image_url"), 
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
export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  date: timestamp("date"),
  status: varchar("status", { length: 50 }).default("scheduled"), // 'scheduled', 'completed', etc.
  
  // 🎯 ADD THIS LINE HERE:
  weekNumber: integer("week_number").default(1).notNull(),

  homeTeamId: integer("home_team_id"),
  awayTeamId: integer("away_team_id"),
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
  seasonId: integer("season_id"),
  divisionId: integer("division_id"),
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