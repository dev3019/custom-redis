import { Engine } from "../engine";
import { CommandContext } from "../commands/context";
import { CommandDispatcher } from "../commands/dispatcher";
import { CommandRegistry } from "../commands/registry";
import { SetCommand, GetCommand } from "../commands/handlers/string";
import { ExpireCommand } from "../commands/handlers/ttl";

export type MiniRedisOptions = {
  dbCount?: number;
};

export class MiniRedis {
  private engine: Engine;
  private dispatcher: CommandDispatcher;
  private context: CommandContext;

  constructor(options?: MiniRedisOptions) {
    this.engine = new Engine(options?.dbCount);

    const registry = new CommandRegistry();
    registry.register(new SetCommand());
    registry.register(new GetCommand());
    registry.register(new ExpireCommand());

    this.dispatcher = new CommandDispatcher(this.engine, registry);
    this.context = new CommandContext({ dbIndex: 0 });
  }

  set(key: string, value: string): string {
    return this.dispatcher.dispatch("SET", [key, value], this.context) as string;
  }

  get(key: string): string | null {
    return this.dispatcher.dispatch("GET", [key], this.context) as string | null;
  }

  expire(key: string, seconds: number): 1 | 0 {
    return this.dispatcher.dispatch("EXPIRE", [key, seconds], this.context) as 1 | 0;
  }

  select(dbIndex: number): void {
    this.engine.getDatabase(dbIndex);
    this.context = this.context.withDatabase(dbIndex);
  }

  listen(_port: number): void {
    throw new Error("listen() is not implemented. Server mode will be available in Phase 2C.");
  }

  close(): void {
    throw new Error("close() is not implemented. Server mode will be available in Phase 2C.");
  }
}
