import { ValueEntry } from "./valueEntry";

export class Database {
  /**
   * Stores keys & values
   * Enforces TTL lazily
   */
  private keyspace = new Map<string, ValueEntry>();
  private expirations = new Map<string, number>();

  /**
   * Returns value or null
   * Must delete expired keys
   */
  get(key: string): ValueEntry | null {
    // lazy expiry check
    if (this.isExpired(key)){
      this.delete(key);
      return null;
    }
    return this.keyspace.get(key) || null;
  }

  /**
   * Overwrites existing key
   * Must NOT manage TTL unless instructed
   */
  set(key: string, entry: ValueEntry) {
    this.keyspace.set(key, entry);
  }

  /**
   * Deletes key & TTL metadata
   */
  delete(key: string) {
    this.keyspace.delete(key);
    this.expirations.delete(key);
  }

  /**
   * Sets expiry timestamp
   * Must do nothing if key does not exist
   */
  setExpiry(key: string, timestampMs: number) {
    if (!this.keyspace.has(key)) return;
    this.expirations.set(key, timestampMs);
  }

  /**
   * Checks expiry without deleting
   */
  isExpired(key: string): boolean {
    const expiry = this.expirations.get(key);
    return expiry !== undefined && Date.now() >= expiry;
  }
}
