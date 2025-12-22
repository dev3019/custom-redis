type Meta = {
  command?: string;
  dbIndex?: number;
  clientId?: string;
  argsCount?: number;
}

type Detail = string | { [key: string]: string | number | boolean };

export class CommandError extends Error {
  readonly details: Detail[] = [];
  readonly meta: Meta;

  constructor(message: string, meta: Meta = {}) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = new.target.name;
    this.meta = Object.freeze(meta);
  }

  /**
   * Adds detail(s) to the error.
   * Mutates the current error instance.
   */
  addDetails(detail: Detail | Detail[]) {
    if (Array.isArray(detail)) {
      this.details.push(...detail);
    } else {
      this.details.push(detail);
    }
  }
}

export class UnknownCommandError extends CommandError {
  constructor(command: string) {
    super(`Unknown command '${command}'`, { command });
  }
}
type ArityErrorDetails = {
  min: number;
  max: number;
  actual: number;
}
export class ArityError extends CommandError {
  constructor(command: string, meta: ArityErrorDetails = { min: 0, max: 0, actual: 0 }) {
    super(`Wrong number of arguments for '${command}' (expected ${meta.min}..${meta.max}, got ${meta.actual})`,
      { command, argsCount: meta.actual });
  }
}

export class InvalidArgumentError extends CommandError {
  constructor(message: string, meta: Meta = {}) {
    super(message, meta);
  }
}
