export type RedisDataType = "string" | "list" | "set" | "hash" | "stream";

export class ValueEntry<T = unknown> {
  readonly type: RedisDataType;
  readonly value: T;
  readonly createdAt: number;
  readonly updatedAt: number;

  constructor(type: RedisDataType, value: T, createdAt?: number) {
    const now = Date.now();
    this.type = type;
    this.value = value;
    this.createdAt = createdAt ?? now;
    this.updatedAt = now;
  }

  cloneWithValue<U>(value: U): ValueEntry<U> {
    return new ValueEntry(this.type, value, this.createdAt);
  }
}