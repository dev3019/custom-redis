import { Engine, ValueEntry } from "../../engine";
import { Command } from "../command";
import { CommandContext } from "../context";
import { InvalidArgumentError } from "../errors";

interface SetCommandArgs {
  key: string;
  value: string;
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
    const errors: { argument: string; receivedType: string }[] = [];
    const [key, value] = rawArgs;

    if (typeof key !== "string") {
      errors.push({ argument: "key", receivedType: typeof key });
    }
    if (typeof value !== "string") {
      errors.push({ argument: "value", receivedType: typeof value });
    }

    if (errors.length > 0) {
      const error = new InvalidArgumentError("Invalid argument(s) for SET command");
      error.addDetails(errors);
      throw error;
    }

    return {
      key,
      value,
    };
  }

  /**
   * Execute SET semantics.
   * - Overwrite value if key exists
   * - Preserve TTL (per our design)
   */
  execute(engine: Engine, context: CommandContext, args: SetCommandArgs): "OK" {
    const db = engine.getDatabase(context.dbIndex);
    db.set(args.key, new ValueEntry("string", args.value));
    return "OK";
  }
}
