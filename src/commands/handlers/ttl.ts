import { Engine } from "../../engine";
import { Command } from "../command";
import { CommandContext } from "../context";
import { InvalidArgumentError } from "../errors";

interface ExpireCommandArgs {
  key: string;
  seconds: number;
}

export class ExpireCommand extends Command<ExpireCommandArgs, 0 | 1> {
  readonly name = "EXPIRE";

  readonly arity = {
    min: 2,
    max: 2,
  };

  readonly isWrite = true;

  parse(rawArgs: unknown[]): ExpireCommandArgs {
    if (typeof rawArgs[0] !== "string") {
      throw new InvalidArgumentError("Key must be a string", { command: "EXPIRE" });
    }
    if (typeof rawArgs[1] !== "number" || !Number.isInteger(rawArgs[1])) {
      throw new InvalidArgumentError("Seconds must be an integer", { command: "EXPIRE" });
    }
    return { key: rawArgs[0], seconds: rawArgs[1] };
  }

  execute(engine: Engine, context: CommandContext, args: ExpireCommandArgs): 0 | 1 {
    const db = engine.getDatabase(context.dbIndex);
    const entry = db.get(args.key);
    if (entry === null) return 0;

    if (args.seconds <= 0) {
      db.delete(args.key);
      return 1;
    }

    db.setExpiry(args.key, Date.now() + args.seconds * 1000);
    return 1;
  }
}
