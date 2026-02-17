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
    const args = rawArgs.map((arg) => {
      const stringArg = String(arg);
      if (!stringArg) {
        errors.push({ detailMsg: `Argument '${stringArg}' is not a valid string`, arg });
        return "";
      }
      return stringArg;
    });
    if (errors.length > 0) {
      const error = new InvalidArgumentError("Invalid argument(s) for SET command");
      error.addDetails(errors)
      throw error;
    }
    return {
      key: args[0],
      value: args[1]
    };
  }

  /**
   * Execute SET semantics.
   * - Overwrite value if key exists
   * - Preserve TTL (per our design)
   */
  execute(engine: Engine, context: CommandContext, args: SetCommandArgs): "OK" {
    engine.getDatabase(context.dbIndex).set(args.key, new ValueEntry("string", args.value).);
    return "OK";
  }
}
