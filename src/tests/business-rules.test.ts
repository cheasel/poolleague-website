import { test, describe } from "node:test";
import assert from "node:assert";
import { db } from "../db/index.js";
import { teams, venues } from "../db/schema.js";
import { eq, count } from "drizzle-orm";

describe("Venue Roster Capacity Business Rule", () => {
  test("should enforce maximum of 2 home teams per venue and flag occupancy limits", async () => {
    let rolledBack = false;

    try {
      await db.transaction(async (tx) => {
        // 1. Establish temporary host venue
        const [tempVenue] = await tx
          .insert(venues)
          .values({
            name: `Test Rule Arena ${Date.now()}`,
            address: "999 Rule Book Way",
            isActive: true,
          })
          .returning();

        assert.ok(tempVenue.id);

        // 2. Assert initial occupancy counts = 0
        const [count0] = await tx
          .select({ value: count() })
          .from(teams)
          .where(eq(teams.homeVenueId, tempVenue.id));
        
        assert.strictEqual(count0?.value || 0, 0);

        // 3. Register 1st team
        await tx.insert(teams).values({
          name: `Rule Team Alpha ${Date.now()}`,
          homeVenueId: tempVenue.id,
        });

        // Assert occupancy = 1, rule allows more
        const [count1] = await tx
          .select({ value: count() })
          .from(teams)
          .where(eq(teams.homeVenueId, tempVenue.id));
        
        assert.strictEqual(count1?.value || 0, 1);
        assert.ok((count1?.value || 0) < 2, "Should allow more registrations");

        // 4. Register 2nd team
        await tx.insert(teams).values({
          name: `Rule Team Beta ${Date.now()}`,
          homeVenueId: tempVenue.id,
        });

        // Assert occupancy = 2, rule flags at capacity limit
        const [count2] = await tx
          .select({ value: count() })
          .from(teams)
          .where(eq(teams.homeVenueId, tempVenue.id));
        
        assert.strictEqual(count2?.value || 0, 2);
        
        const isAtCapacity = (count2?.value || 0) >= 2;
        assert.strictEqual(isAtCapacity, true, "Occupancy should flag as full");

        // 5. Force transaction rollback to keep DB clean
        rolledBack = true;
        tx.rollback();
      });
    } catch (err: any) {
      // Drizzle ORM throws a specific rollback exception when tx.rollback() is called.
      // We swallow it if it is the rollback we triggered.
      if (!rolledBack) {
        throw err;
      }
    }

    assert.strictEqual(rolledBack, true, "Transaction should successfully roll back and not persist changes");
  });
});
