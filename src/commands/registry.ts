import { Command } from "./command";
import { CommandError } from "./errors";

export class CommandRegistry {
  /**
   * Maps command name → Command instance
   */
  private commands = new Map<string, Command>();

  /**
   * Registers a command at startup
   * Must throw on duplicate names
   */
  register(command: Command): void {
    const commandName = command.name.toUpperCase();
    if (this.commands.has(commandName)) throw new CommandError(`Command '${commandName}' is already registered`);
    this.commands.set(commandName, command);
  }

  /**
   * Resolves a command by name
   * Returns null if not found
   */
  get(name: string): Command | null {
    return this.commands.get(name.toUpperCase()) || null;
  }

  /**
   * Returns all registered commands
   * Used for introspection / help
   */
  list(): Command[] {
    return Array.from(this.commands.values());
  }
}
