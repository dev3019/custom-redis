import { CommandRegistry } from "./registry";
import { CommandContext } from "./context";
import { Engine } from "../engine";
import { ArityError, UnknownCommandError } from "./errors";

export class CommandDispatcher {
  private readonly engine: Engine;
  private readonly registry: CommandRegistry;
  constructor(
    engine: Engine,
    registry: CommandRegistry
  ) {
    this.engine = engine;
    this.registry = registry;
  }

  /**
   * Dispatches a command by name
   * Orchestrates:
   * - lookup
   * - arity validation
   * - parsing
   * - execution
   */
  dispatch(
    commandName: string,
    rawArgs: unknown[],
    context: CommandContext
  ): unknown {
    const command = this.registry.get(commandName);
    if (!command) throw new UnknownCommandError(commandName);

    // Arity check
    if (rawArgs.length < command.arity.min || rawArgs.length > command.arity.max) {
      throw new ArityError(commandName);
    }

    // Argument parsing
    const args = command.parse ? command.parse(rawArgs): rawArgs;
    
    // Execute command logic
    return command.execute(this.engine, context, args);
  }
}
