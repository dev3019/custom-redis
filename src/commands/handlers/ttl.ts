import { Engine } from "../../engine";
import { Command } from "../command";
import { CommandContext } from "../context";
import { InvalidArgumentError } from "../errors";

interface ExpireCommandArgs {
  key: string;
  seconds: number;
}

const MILLISECONDS_PER_SECOND = 1000;

export class ExpireCommand extends Command<ExpireCommandArgs, 0 | 1> {
  readonly name = "EXPIRE";

  readonly arity = {
    min: 2,
    max: 2,
  };

  readonly isWrite = true;

  parse(rawArgs: unknown[]): ExpireCommandArgs {
    const [key, seconds] = rawArgs;

    if (typeof key !== "string") {
      throw new InvalidArgumentError("Key must be a string", { command: "EXPIRE" });
    }
    if (typeof seconds !== "number" || !Number.isFinite(seconds) || !Number.isInteger(seconds)) {
      throw new InvalidArgumentError("Seconds must be an integer", { command: "EXPIRE" });
    }

    return { key, seconds };
  }

  execute(engine: Engine, context: CommandContext, args: ExpireCommandArgs): 0 | 1 {
    const db = engine.getDatabase(context.dbIndex);
    if (db.get(args.key) === null) return 0;

    if (args.seconds <= 0) {
      db.delete(args.key);
      return 1;
    }

    db.setExpiry(args.key, Date.now() + args.seconds * MILLISECONDS_PER_SECOND);
    return 1;
  }
}
