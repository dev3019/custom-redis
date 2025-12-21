import { DEFAULT_DB_COUNT } from "../configs";
import { Database } from "./database";

export class Engine {
  /**
   * Owns all databases (0–15)
   * Coordinates TTL & persistence
   * Single source of truth
   */
  private databases: Database[];
  readonly dbCount: number;

  constructor(dbCount: number = DEFAULT_DB_COUNT) {
    // initialize databases
    this.dbCount = dbCount;
    this.databases = Array.from(
      { length: this.dbCount },
      () => new Database()
    );

  }

  /**
   * Returns a database by index.
   * Must throw if index is invalid.
   */
  getDatabase(index: number): Database {
    // return Database
    if (index < 0 || index >= this.dbCount) throw new Error('Database index out of range');
    return this.databases[index];
  }

  /**
   * Executes a command in a given context.
   * Must be synchronous.
   */
  // execute(command, context) {
  //   // dispatch command
  // }
}
