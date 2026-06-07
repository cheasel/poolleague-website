# Lanna Pool Club League Arena

A full-stack, highly optimized web application built for local pool leagues in Chiang Mai, Thailand. This portal serves as the single source of truth for players, teams, standings, schedules, and administrative league operations.

---

## 🚀 Key Features

### 🏆 Public Portal
- **Live Standings Dashboard**: Real-time division rankings calculated dynamically from completed match scores (points, frame differences, and overall wins).
- **Match Timelines**: Browse fixtures and scores chronologically by week, date, and division with client-side interactive search filters.
- **Roster & Player Stats**: In-depth statistics including frame win ratios, individual records, match attendance percentages, and top-tier player rankings.
- **Match Hub**: A centralized portal linking live standings tables, upcoming match fixtures, and completed results per division season.

### ⚡ Performance & Streaming Layouts
- **Sequential Waterfall Eliminator**: Concurrent database reads wrapped in `Promise.all` minimize server-side blocking execution.
- **Next.js Layout Streaming**: Root dynamic page renders are non-blocking, delegating heavy database reads into nested components wrapped inside `<Suspense>` boundaries. The browser instantly receives the layout frame (Navbar, container, filters) while database data streams in asynchronously.
- **Unique Cache Key Serialization**: Wrapper patterns around Next.js `unstable_cache` prevent query collisions across varying entities (players, teams, and seasons).

### 🛠️ Admin Management Panel
- **Role-Based Protection**: Administrative paths protected via Supabase authentication middleware.
- **League Schedule Generator**: Custom algorithm for automatic fixture creation and venue double-booking validations.
- **Scorecard Entry System**: Live scorecard entry for team matches, supporting individual frame wins, singles/doubles game setups, and automatic stats aggregation.
- **Safe Archiving Guard**: Confirmation safety checks requiring organizers to type the exact name of an archived or completed season before executing a delete command.

---

## 💻 Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Server Actions, React 19)
- **Database ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Database Engine**: PostgreSQL (Supabase cloud provider)
- **Authentication**: [Supabase Auth](https://supabase.com/docs/guides/auth)
- **Styling & UI**: Tailwind CSS, PostCSS, & Lucide Icons

---

## ⚙️ Environment Configuration

To run the application locally, create a `.env.local` file at the root of the project directory and configure the following variables:

```bash
# PostgreSQL DB Connection Parameters
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
DIRECT_URL="postgresql://user:password@host:port/database"

# Supabase Auth Integration Keys
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Client URL Reference
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## 🛠️ Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Schema Migrations
Push the local Drizzle schema mapping straight to your database:
```bash
npx drizzle-kit push
```

### 3. Launch the Local Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) inside your browser.

### 4. Run the Test Suite
Verify middleware protections, redirects, business rules, and stats calculations:
```bash
npm test
```

### 5. Run Linter Audits
Check for TypeScript and syntax conformance:
```bash
npm run lint
```

### 6. Production Compilation Build
Compile the production optimized Next.js project layout:
```bash
npm run build
```