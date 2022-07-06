import yargs from "yargs";
import join from "./join";
import split from "./split";
import {
  Abort,
  JoinError,
  LOCAL_MARKS_FILENAME,
  GLOBAL_MARKS_FILENAME,
} from "./utils";

export default function app(params: string[]) {
  return yargs(params)
    .demandCommand(1)
    .fail(function (msg: string | null, err: Error | null) {
      if (err != null) {
        // eslint-disable-next-line
        console.error("\n\x1b[31m%s\x1b[0m", err.message);
        if (err.stack) {
          // eslint-disable-next-line
          console.log(err.stack);
        }
      } else if (msg != null) {
        // eslint-disable-next-line
        console.error("\n\x1b[31m%s\x1b[0m", msg);
      }
      process.exit(1);
    })
    .command(
      "split <input-file>",
      "Split and arrange .audipomarks data by directories, relative to the storage location.",
      (yargs) =>
        yargs
          .positional("input-file", {
            describe: "Existing .audipomarks file",
            type: "string",
            demandOption: true,
          })
          .options({
            root: {
              alias: "r",
              description:
                "Path to this directory on phone, absolute or relative to `externalStorageDirectory` top-level property of the .audiomark file.",
              type: "string",
              require: true,
            },
          })
          .usage("usage: $0 -r /path/to/root <input-file>")
          .example(
            "$0 split -r data/languages exportedmarks20220706_020654.audipomark",
            "Split exportedmarks20220706_020654.audipomark file relative to the `data/languages`"
          ),
      async (argv) => {
        try {
          await split(argv.inputFile, argv.root);
        } catch (e) {
          if (e instanceof Abort) {
            // eslint-disable-next-line
            console.log("Aborting...");
            process.exit(1);
          }
          // eslint-disable-next-line
          console.log(e);
        }
      }
    )
    .command(
      "join <dir>",
      `Traverses file tree under <dir>, finds all "${LOCAL_MARKS_FILENAME}" files, joins them into one and saves it in <dir>/${GLOBAL_MARKS_FILENAME}`,
      (yargs) =>
        yargs
          .positional("dir", {
            describe: `Working directory`,
            type: "string",
            demandOption: true,
          })
          .usage("usage: $0 <dir>")
          .example(
            "$0 join path/to/MySyncFolder",
            `Collect all "${LOCAL_MARKS_FILENAME}" files under "path/to/MySyncFolder" and join them into "path/to/MySyncFolder/${GLOBAL_MARKS_FILENAME}".`
          ),
      async (argv) => {
        try {
          await join(argv.dir);
        } catch (e) {
          if (e instanceof Abort) {
            // eslint-disable-next-line
            console.log("Aborting...");
            process.exit(1);
          }
          if (e instanceof JoinError) {
            // eslint-disable-next-line
            console.error(e.message);
            process.exit(1);
          }
          // eslint-disable-next-line
          console.log(e);
        }
      }
    )
    .strict();
}
