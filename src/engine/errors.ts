type EngineMeta = Record<string, string | number | boolean>;

export class EngineError extends Error {
  readonly meta: EngineMeta;

  constructor(message: string, meta: EngineMeta = {}) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = new.target.name;
    this.meta = Object.freeze(meta);
  }
}

export class DatabaseIndexOutOfRangeError extends EngineError {
  constructor(index: number, dbCount: number) {
    super(
      `Database index out of range: ${index} (valid range: 0..${dbCount - 1})`,
      { index, dbCount }
    );
  }
}
