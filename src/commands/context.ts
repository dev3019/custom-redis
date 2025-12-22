interface CommandContextProps {
  dbIndex: number;
  clientId?: string;
}
export class CommandContext {
  /**
   * Selected database index (0–15)
   */
  readonly dbIndex: number;

  /**
   * Client metadata (future use)
   * e.g. pub/sub state, connection id
   */
  readonly clientId?: string;

  constructor(params: CommandContextProps = { dbIndex: 0 }) {
    this.dbIndex = params.dbIndex;
    this.clientId = params.clientId;
  }

  /**
   * Returns a new context with updated DB
   * Used by SELECT command
   */
  withDatabase(dbIndex: number): CommandContext {
    return new CommandContext({
      ...this,
      dbIndex,
    });
  }
}
