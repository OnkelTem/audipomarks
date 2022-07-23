import yargs from "yargs";
import join from "./commands/join";
import mark from "./commands/mark";
// import play from "./commands/play";
import split from "./commands/split";
import { Abort, JoinError, MarkError } from "./errors";
import {
  LOCAL_MARKS_FILENAME,
  GLOBAL_MARKS_FILENAME,
  MIN_MARK_DISTANCE_MS,
  err,
  log,
} from "./utils";

export default function app(params: string[]) {
  return (
    yargs(params)
      .demandCommand(1)
      .fail(function (msg: string | null, error: Error | null) {
        if (error != null) {
          err("\n\x1b[31m%s\x1b[0m", error.message);
          if (error.stack) {
            log(error.stack);
          }
        } else if (msg != null) {
          err("\n\x1b[31m%s\x1b[0m", msg);
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
              normalize: {
                alias: "n",
                description: `Normalizes mark list, filtering out marks that are closer than ${MIN_MARK_DISTANCE_MS}ms to the previous ones.`,
                type: "boolean",
                default: false,
              },
            })
            .usage("usage: $0 split -r /path/to/root <input-file>")
            .example(
              "$0 split -r data/languages exportedmarks20220706_020654.audipomark",
              "Split exportedmarks20220706_020654.audipomark file relative to the `data/languages`"
            ),
        async (argv) => {
          try {
            await split(argv.inputFile, argv.root, argv.normalize);
          } catch (e) {
            if (e instanceof Abort) {
              log("Aborting...");
              process.exit(1);
            }
            log(e);
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
            .usage("usage: $0 join <dir>")
            .example(
              "$0 join path/to/MySyncFolder",
              `Collect all "${LOCAL_MARKS_FILENAME}" files under "path/to/MySyncFolder" and join them into "path/to/MySyncFolder/${GLOBAL_MARKS_FILENAME}".`
            ),
        async (argv) => {
          try {
            await join(argv.dir);
          } catch (e) {
            if (e instanceof Abort) {
              log("Aborting...");
              process.exit(1);
            }
            if (e instanceof JoinError) {
              err(e.message);
              process.exit(1);
            }
            log(e);
          }
        }
      )
      .command(
        "mark <dir>",
        `Traverses file tree under <dir>, and creates "${LOCAL_MARKS_FILENAME}" files with silence spots autodetected by FFmpeg "silencedetect" filter.`,
        (yargs) =>
          yargs
            .positional("dir", {
              describe: `Working directory`,
              type: "string",
              demandOption: true,
            })
            .options({
              recursive: {
                alias: "r",
                description: "Operate on directories recrusively.",
                type: "boolean",
                default: false,
              },
            })
            .usage("usage: $0 mark <dir>")
            .example(
              "$0 mark path/to/Lessons_1-10",
              `Process files in "path/to/Lessons_1-10" directory and create "${LOCAL_MARKS_FILENAME}" file there.`
            )
            .example(
              "$0 mark -r path/to/AudioLibrary",
              `Recursively process "path/to/AudioLibrary" directory and create "${LOCAL_MARKS_FILENAME}" in every nested directory with audio files.`
            ),
        async (argv) => {
          try {
            await mark(argv.dir, argv.recursive);
          } catch (e) {
            if (e instanceof MarkError) {
              err(e.message);
              process.exit(1);
            }
            log(e);
          }
        }
      )

      // TODO: do it later. Via VLC HTTP API. Maybe.
      // .command(
      //   "play <file>",
      //   `Plays the file using "${LOCAL_MARKS_FILENAME}" from the file directory.`,
      //   (yargs) =>
      //     yargs
      //       .positional("file", {
      //         describe: `Audio file`,
      //         type: "string",
      //         demandOption: true,
      //       })
      //       .usage("usage: $0 <file>"),
      //   async (argv) => {
      //     try {
      //       await play(argv.file);
      //     } catch (e) {
      //       if (e instanceof Abort) {
      //
      //         log("Aborting...");
      //         process.exit(1);
      //       }
      //       if (e instanceof JoinError) {
      //
      //         err(e.message);
      //         process.exit(1);
      //       }
      //
      //       log(e);
      //     }
      //   }
      // )
      .strict()
  );
}
