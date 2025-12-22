import { CommandContext } from "./context";
import { Engine } from "../engine";

export abstract class Command<TArgs = any, TResult = any> {
  /**
   * Canonical command name (e.g. SET, GET, HSET)
   */
  abstract readonly name: string;

  /**
   * Minimum and maximum arity
   * Example: SET key value -> min=2, max=2
   */
  abstract readonly arity: {
    min: number;
    max: number;
  };

  /**
   * Whether this command mutates state
   * Used later for persistence & replication
   */
  abstract readonly isWrite: boolean;

  /**
   * Execute command logic.
   * MUST be synchronous.
   * MUST NOT perform IO.
   */
  abstract execute(
    engine: Engine,
    context: CommandContext,
    args: TArgs
  ): TResult;

  /**
   * Optional argument normalization / validation hook
   * Throws on invalid input
   */
  parse?(rawArgs: unknown[]): TArgs;
}
