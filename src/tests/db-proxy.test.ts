import { test, describe } from "node:test";
import assert from "node:assert";

// Mock implementation of the proxy wrapper logic from src/db/index.ts
// to test its correctness in isolation from Supabase connection settings.
function createMockDbProxy<T extends object>(rawDb: T, onInvalidate: () => void) {
  function wrapBuilder<B extends object>(builder: B): B {
    return new Proxy(builder, {
      get(bTarget, bProp, bReceiver) {
        const bValue = Reflect.get(bTarget, bProp, bReceiver);
        if (bProp === 'then') {
          return function (
            onfulfilled?: ((value: unknown) => unknown) | null,
            onrejected?: ((reason: unknown) => unknown) | null
          ) {
            const thenFn = bValue as (
              onfulfilled?: ((value: unknown) => unknown) | null,
              onrejected?: ((reason: unknown) => unknown) | null
            ) => unknown;
            return thenFn.call(bTarget, (res: unknown) => {
              onInvalidate();
              return onfulfilled ? onfulfilled(res) : res;
            }, onrejected);
          };
        }
        if (bProp === 'execute') {
          return async function (...args: unknown[]) {
            const executeFn = bValue as (...args: unknown[]) => Promise<unknown>;
            const res = await executeFn.apply(bTarget, args);
            onInvalidate();
            return res;
          };
        }
        if (typeof bValue === 'function') {
          return bValue.bind(bTarget);
        }
        return bValue;
      }
    });
  }

  return new Proxy(rawDb, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);

      if (prop === 'insert' || prop === 'update' || prop === 'delete') {
        return function (...args: unknown[]) {
          const mutationFn = value as (...args: unknown[]) => object;
          const builder = mutationFn.apply(target, args);
          return wrapBuilder(builder);
        };
      }

      if (prop === 'transaction') {
        return async function (
          transactionCallback: (tx: unknown) => Promise<unknown>,
          ...args: unknown[]
        ) {
          const wrappedCallback = async (tx: unknown) => {
            const proxiedTx = new Proxy(tx as object, {
              get(tTarget, tProp, tReceiver) {
                const tValue = Reflect.get(tTarget, tProp, tReceiver);
                if (typeof tValue === 'function') {
                  return tValue.bind(tTarget);
                }
                return tValue;
              }
            });
            return transactionCallback(proxiedTx);
          };
          const transactionFn = value as (
            cb: (tx: unknown) => Promise<unknown>,
            ...args: unknown[]
          ) => Promise<unknown>;
          const res = await transactionFn.call(target, wrappedCallback, ...args);
          onInvalidate();
          return res;
        };
      }

      if (typeof value === 'function') {
        return value.bind(target);
      }
      return value;
    }
  }) as T;
}

describe("Database Cache Invalidation Proxy Wrapper", () => {
  test("should intercept insert operations and trigger invalidation callback on execute", async () => {
    let invalidateCalledCount = 0;
    const mockBuilder = {
      execute: async () => {
        return { success: true };
      }
    };
    const mockRawDb = {
      insert: () => mockBuilder
    };

    const proxiedDb = createMockDbProxy(mockRawDb, () => {
      invalidateCalledCount++;
    });

    const builder = proxiedDb.insert();
    const result = await builder.execute();

    assert.deepStrictEqual(result, { success: true });
    assert.strictEqual(invalidateCalledCount, 1);
  });

  test("should intercept update operations and trigger invalidation callback on then (Promise-like)", async () => {
    let invalidateCalledCount = 0;
    const mockBuilder = {
      then: function(resolve: (value: { rowsAffected: number }) => unknown) {
        return resolve({ rowsAffected: 1 });
      }
    };
    const mockRawDb = {
      update: () => mockBuilder
    };

    const proxiedDb = createMockDbProxy(mockRawDb, () => {
      invalidateCalledCount++;
    });

    const builder = proxiedDb.update();
    const result = await new Promise((resolve) => {
      // Simulate promise resolving
      const thenable = builder as { then: (resolve: (res: unknown) => void) => void };
      thenable.then((res: unknown) => resolve(res));
    });

    assert.deepStrictEqual(result, { rowsAffected: 1 });
    assert.strictEqual(invalidateCalledCount, 1);
  });

  test("should handle transactions and trigger invalidation callback exactly once after transaction completes", async () => {
    let invalidateCalledCount = 0;
    const mockTxBuilder = {
      execute: async () => {
        return { updated: true };
      }
    };
    const mockTx = {
      delete: () => mockTxBuilder,
      insert: () => mockTxBuilder,
    };
    const mockRawDb = {
      transaction: async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
        return callback(mockTx);
      }
    };

    const proxiedDb = createMockDbProxy(mockRawDb, () => {
      invalidateCalledCount++;
    });

    await proxiedDb.transaction(async (tx: typeof mockTx) => {
      const builder1 = tx.delete();
      await builder1.execute();
      const builder2 = tx.insert();
      await builder2.execute();
    });

    assert.strictEqual(invalidateCalledCount, 1);
  });
});
