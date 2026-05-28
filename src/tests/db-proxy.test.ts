import { test, describe } from "node:test";
import assert from "node:assert";

// Mock implementation of the proxy wrapper logic from src/db/index.ts
// to test its correctness in isolation from Supabase connection settings.
function createMockDbProxy(rawDb: any, onInvalidate: () => void) {
  function wrapBuilder(builder: any) {
    return new Proxy(builder, {
      get(bTarget, bProp, bReceiver) {
        const bValue = Reflect.get(bTarget, bProp, bReceiver);
        if (bProp === 'then') {
          return function (onfulfilled?: Function, onrejected?: Function) {
            return bValue.call(bTarget, (res: any) => {
              onInvalidate();
              return onfulfilled ? onfulfilled(res) : res;
            }, onrejected);
          };
        }
        if (bProp === 'execute') {
          return async function (...args: any[]) {
            const res = await (bValue as Function).apply(bTarget, args);
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
        return function (...args: any[]) {
          const builder = (value as Function).apply(target, args);
          return wrapBuilder(builder);
        };
      }

      if (prop === 'transaction') {
        return function (transactionCallback: Function, ...args: any[]) {
          const wrappedCallback = async (tx: any) => {
            const proxiedTx = new Proxy(tx, {
              get(tTarget, tProp, tReceiver) {
                const tValue = Reflect.get(tTarget, tProp, tReceiver);
                if (tProp === 'insert' || tProp === 'update' || tProp === 'delete') {
                  return function (...tArgs: any[]) {
                    const builder = (tValue as Function).apply(tTarget, tArgs);
                    return wrapBuilder(builder);
                  };
                }
                if (typeof tValue === 'function') {
                  return tValue.bind(tTarget);
                }
                return tValue;
              }
            });
            return transactionCallback(proxiedTx);
          };
          return (value as Function).call(target, wrappedCallback, ...args);
        };
      }

      if (typeof value === 'function') {
        return value.bind(target);
      }
      return value;
    }
  });
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
      then: function(resolve: any) {
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
      (builder as any).then((res: any) => resolve(res));
    });

    assert.deepStrictEqual(result, { rowsAffected: 1 });
    assert.strictEqual(invalidateCalledCount, 1);
  });

  test("should handle transactions and propagate invalidation calls within transaction scope", async () => {
    let invalidateCalledCount = 0;
    const mockTxBuilder = {
      execute: async () => {
        return { updated: true };
      }
    };
    const mockTx = {
      delete: () => mockTxBuilder
    };
    const mockRawDb = {
      transaction: async (callback: Function) => {
        return callback(mockTx);
      }
    };

    const proxiedDb = createMockDbProxy(mockRawDb, () => {
      invalidateCalledCount++;
    });

    await proxiedDb.transaction(async (tx: any) => {
      const builder = tx.delete();
      const result = await builder.execute();
      assert.deepStrictEqual(result, { updated: true });
    });

    assert.strictEqual(invalidateCalledCount, 1);
  });
});
