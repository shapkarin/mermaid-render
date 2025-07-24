/**
 * Functional database operations for caching
 */

import { Database } from 'sqlite3';
import { DatabaseOperations } from './types';
import { Either, Left, Right, Maybe } from './utils';

/**
 * Create database operations with functional interface
 */
export const createDatabaseOperations = (dbPath: string): DatabaseOperations => {
  let db: Database | null = null;

  const init = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      db = new Database(dbPath, (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Create cache table if it doesn't exist
        db!.run(`
          CREATE TABLE IF NOT EXISTS diagram_cache (
            content_hash TEXT PRIMARY KEY,
            svg_path TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });
  };

  const close = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (db) {
        db.close((err) => {
          if (err) {
            reject(err);
          } else {
            db = null;
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  };

  const checkCached = async (hash: string): Promise<string | null> => {
    return new Promise((resolve, reject) => {
      if (!db) {
        reject(new Error('Database not initialized'));
        return;
      }

      db.get(
        'SELECT svg_path FROM diagram_cache WHERE content_hash = ?',
        [hash],
        (err, row: any) => {
          if (err) {
            reject(err);
          } else {
            resolve(row ? row.svg_path : null);
          }
        }
      );
    });
  };

  const store = async (hash: string, path: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!db) {
        reject(new Error('Database not initialized'));
        return;
      }

      db.run(
        `INSERT OR REPLACE INTO diagram_cache 
         (content_hash, svg_path, updated_at) 
         VALUES (?, ?, CURRENT_TIMESTAMP)`,
        [hash, path],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  };

  return {
    init,
    close,
    checkCached,
    store
  };
};

/**
 * Functional wrapper for database operations with Either monad
 */
export const safeDatabaseOperations = (dbOps: DatabaseOperations) => ({
  init: async (): Promise<Either<string, void>> => {
    try {
      await dbOps.init();
      return new Right(undefined);
    } catch (error) {
      return new Left(`Database initialization failed: ${error}`);
    }
  },

  close: async (): Promise<Either<string, void>> => {
    try {
      await dbOps.close();
      return new Right(undefined);
    } catch (error) {
      return new Left(`Database close failed: ${error}`);
    }
  },

  checkCached: async (hash: string): Promise<Either<string, Maybe<string>>> => {
    try {
      const result = await dbOps.checkCached(hash);
      return new Right(Maybe.of(result));
    } catch (error) {
      return new Left(`Cache check failed: ${error}`);
    }
  },

  store: async (hash: string, path: string): Promise<Either<string, void>> => {
    try {
      await dbOps.store(hash, path);
      return new Right(undefined);
    } catch (error) {
      return new Left(`Cache store failed: ${error}`);
    }
  }
});