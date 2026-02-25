import { SetCommand } from "./handlers/string";
import { CommandRegistry } from "./registry";

/**
 * Registers the currently supported core commands.
 */
export function registerCoreCommands(registry: CommandRegistry): void {
  registry.register(new SetCommand());
}

/**
 * Creates a registry preloaded with built-in commands.
 */
export function createDefaultRegistry(): CommandRegistry {
  const registry = new CommandRegistry();
  registerCoreCommands(registry);
  return registry;
}
