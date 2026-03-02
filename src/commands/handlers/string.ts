import { Engine, ValueEntry } from "../../engine";
import { Command } from "../command";
import { CommandContext } from "../context";
import { InvalidArgumentError, WrongTypeError } from "../errors";

interface SetCommandArgs {
  key: string;
  value: string;
}

interface GetCommandArgs {
  key: string;
}
export class SetCommand extends Command<
  SetCommandArgs,
  "OK"
> {
  readonly name = "SET";

  readonly arity = {
    min: 2,
    max: 2,
  };

  readonly isWrite = true;

  /**
   * Parse raw args into structured form.
   * - Validate key/value types
   * - Throw InvalidArgumentError on failure
   */
  parse(rawArgs: unknown[]): SetCommandArgs {
    if (typeof rawArgs[0] !== "string") {
      throw new InvalidArgumentError("Key must be a string", { command: "SET" });
    }
    if (typeof rawArgs[1] !== "string") {
      throw new InvalidArgumentError("Value must be a string", { command: "SET" });
    }
    return { key: rawArgs[0], value: rawArgs[1] };
  }

  /**
   * Execute SET semantics.
   * - Overwrite value if key exists
   * - Preserve TTL (per our design)
   */
  execute(engine: Engine, context: CommandContext, args: SetCommandArgs): "OK" {
    engine.getDatabase(context.dbIndex).set(args.key, new ValueEntry("string", args.value));
    return "OK";
  }
}

export class GetCommand extends Command<
  GetCommandArgs,
  string | null
> {
  readonly name = "GET";

  readonly arity = {
    min: 1,
    max: 1,
  };

  readonly isWrite = false;

  /**
   * Parse raw args into structured form.
   * - Validate key type
   * - Throw InvalidArgumentError on failure
   */
  parse(rawArgs: unknown[]): GetCommandArgs {
    if (typeof rawArgs[0] !== "string") {
      throw new InvalidArgumentError("Key must be a string", { command: "GET" });
    }
    return { key: rawArgs[0] };
  }

  /**
   * Execute GET semantics.
   * - Return null when key is missing or expired
   * - Throw WrongTypeError when key does not hold a string
   */
  execute(engine: Engine, context: CommandContext, args: GetCommandArgs): string | null {
    const entry = engine.getDatabase(context.dbIndex).get(args.key);

    if (!entry) return null;
    if (entry.type !== "string") {
      throw new WrongTypeError(this.name, "string", entry.type);
    }

    return entry.value as string;
  }
}
