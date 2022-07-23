import path from "path";
import fs from "fs";
import { promises as fsPromises } from "fs";

import {
  directoryExists,
  GLOBAL_MARKS_FILENAME,
  LOCAL_MARKS_FILENAME,
  log,
} from "../utils";
import { enumarateMarks, readStorage } from "../services/audipomark.service";
import { AudipoMarksStorage } from "../models/audipomark.model";
import { askUser, yesRegExp } from "../services/readline.service";
import { Abort, JoinError, StorageError } from "../errors";

export default async function (workingDir: string) {
  const absoluteWorkingDir = path.resolve(workingDir);

  if (!directoryExists(workingDir)) {
    throw new JoinError(`Directory not found: "${directoryExists}"`);
  }
  const audipoMarksStorage: AudipoMarksStorage = {
    // We're going to create a file, relative to the working tree
    externalStorageDirectory: "",
    files: [],
  };

  let markId = 1;

  for await (const f of getFiles(workingDir)) {
    if (path.basename(f) !== LOCAL_MARKS_FILENAME) continue;
    // Skip the MARK_FILENAME in the workingDir
    if (absoluteWorkingDir === path.dirname(f)) continue;

    const storageDir = path.relative(path.resolve(workingDir), path.dirname(f));

    log(`Reading audipomarks file: "${f}"`);
    let localAudipoMarksStorage: AudipoMarksStorage;
    try {
      localAudipoMarksStorage = readStorage(f);
    } catch (e) {
      if (e instanceof StorageError) {
        const answer = await askUser(
          `File "${f}" has the following errors: \n` +
            e.message +
            "\n. Ignore this file and proceed? [Y/n]"
        );
        if (!yesRegExp.test(answer) && answer !== "") {
          throw new Abort();
        }
        continue;
      } else {
        throw e;
      }
    }
    // We need to recalculate file paths and renumerate ids
    for (const file of localAudipoMarksStorage.files) {
      audipoMarksStorage.files.push({
        ...file,
        filepath: path.join(storageDir, file.filepath),
        // Renumerate mark ids
        marklist: enumarateMarks(file.marklist, markId),
      });
      markId = markId + file.marklist.length;
    }
  }
  const storageFilePath = path.join(workingDir, GLOBAL_MARKS_FILENAME);

  log(`Writing file: "${storageFilePath}"`);
  fs.writeFileSync(storageFilePath, JSON.stringify(audipoMarksStorage));
}

async function* getFiles(dir: string): AsyncGenerator<string> {
  const dirents = await fsPromises.readdir(dir, { withFileTypes: true });
  for (const dirent of dirents) {
    const res = path.resolve(dir, dirent.name);
    if (dirent.isDirectory()) {
      yield* getFiles(res);
    } else {
      yield res;
    }
  }
}
