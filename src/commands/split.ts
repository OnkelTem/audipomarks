import path from "path";
import fs from "fs";

import {
  AudipoMarksFile,
  AudipoMarksStorage,
} from "../models/audipomark.model";
import { directoryExists, fileExists, isChildOfPath, log } from "../utils";
import {
  enumarateMarks,
  normalizeMarks,
  readStorage,
} from "../services/audipomark.service";
import { allRegExp, askUser, yesRegExp } from "../services/readline.service";
import { Abort } from "../errors";
import { LOCAL_MARKS_FILENAME } from "../constants";

type DirFilesMap = Map<string, AudipoMarksFile[]>;

/**
 *
 * @param inputFilePath Path to a marks storage, an .audipomark file.
 * @param phoneUserDir Path to the user directory on the phone.
 *
 * For example, if the user filesystem is located at /storage/emulated/0 on the phone,
 * and our user directory there is path/to/MySyncedFolder, then `phoneUserDir` param should be
 * either "path/to/MySyncFolder" (relative) or "/storage/emulated/0/path/to/MySyncFolder" (absolute).
 * And it is assumed, that the marks storage containing directory (`inputFilePath`) is a copy of "MySyncFolder".
 */
export default async function (
  inputFilePath: string,
  phoneUserDir: string,
  normalize: boolean
) {
  const audipoMarksStorage = readStorage(inputFilePath);

  // Absolute path like "/storage/emulated/0/path/to/MySyncFolder", see above.
  const absolutePhoneUserDir = path.isAbsolute(phoneUserDir)
    ? phoneUserDir
    : path.isAbsolute(audipoMarksStorage.externalStorageDirectory)
    ? path.join(audipoMarksStorage.externalStorageDirectory, phoneUserDir)
    : path.resolve(phoneUserDir);

  // All operations will be performed relative to the `inputFilePath` containing directory
  const workingDir = path.resolve(path.dirname(inputFilePath));

  // Get the map of dir => files from the storage
  const dirFilesMap = buildDirFilesMap(
    audipoMarksStorage,
    absolutePhoneUserDir,
    workingDir
  );

  // Validate our map against our real files and relaitve to the workingDir
  const validatedDirFilesMap = await validateDirFilesMap(
    dirFilesMap,
    workingDir,
    normalize
  );

  // Finally, write files into directories.
  writeNewStorages(validatedDirFilesMap);
}

function buildDirFilesMap(
  audipoMarksStorage: AudipoMarksStorage,
  absolutePhoneUserDir: string,
  workingDir: string
) {
  const dirFilesMap: DirFilesMap = new Map();
  for (const file of audipoMarksStorage.files) {
    // Calculate file the path relative to the working directory
    // It will look like: path/to/file.mp3
    const filepath = path.join(
      workingDir,
      path.isAbsolute(file.filepath)
        ? path.relative(absolutePhoneUserDir, file.filepath)
        : file.filepath
    );
    const dir = path.resolve(path.dirname(filepath));
    const newFileEntry = {
      ...file,
      filepath: path.relative(dir, filepath),
    };
    if (dirFilesMap.has(dir)) {
      const dirFileMapItem = dirFilesMap.get(dir)!;
      dirFileMapItem.push(newFileEntry);
    } else {
      dirFilesMap.set(dir, [newFileEntry]);
    }
  }
  return dirFilesMap;
}

async function validateDirFilesMap(
  dirFileMap: DirFilesMap,
  workingDir: string,
  normalize: boolean
) {
  const validatedDirFilesMap: DirFilesMap = new Map();

  log("Checking working dir for storage conformance");

  log(`Marks normalization: ${normalize ? "enabled" : "disabled"}`);

  let yesToAllNoExists = false;
  let yesToAllSizeDiffers = false;

  for (const [dir, files] of dirFileMap.entries()) {
    // We have to check if dir belongs to the working file tree

    if (!isChildOfPath(dir, workingDir)) {
      const answer = await askUser(
        `Directory "${dir}" is outside the working dir, proceed and skip it? [Y/n]`
      );
      if (!yesRegExp.test(answer) && answer !== "") {
        throw new Abort();
      }
      continue;
    }

    // Check directories

    if (!directoryExists(dir)) {
      // Storage may contain unexisting directories that we may want to ignore.
      const answer = await askUser(
        `Directory "${dir}" doesn't exist or isn't available, proceed and skip it? [Y/n]`
      );
      if (!yesRegExp.test(answer) && answer !== "") {
        throw new Abort();
      }
      continue;
    }

    // Check files

    const validatedFiles: AudipoMarksFile[] = [];

    // Marks ID numerator
    let markId = 1;

    for (const file of files) {
      const filePath = path.join(dir, file.filepath);
      // Chech file existence
      if (!fileExists(filePath)) {
        log(`File doesn't exist or isn't available: "${filePath}"`);
        if (!yesToAllNoExists) {
          // Storage may contain unexisting files or directories that we may want to ignore.
          const answer = await askUser(`Ignore file? [Y/a/n]`);
          if (
            !yesRegExp.test(answer) &&
            !allRegExp.test(answer) &&
            answer !== ""
          ) {
            throw new Abort();
          }
          if (allRegExp.test(answer)) {
            yesToAllNoExists = true;
          }
        }

        log("ignoring");
        continue;
      }
      // Check file sizes
      let realFileSize = 0;
      try {
        realFileSize = fs.statSync(filePath).size;
        if (realFileSize != file.fileSize) {
          log(
            `File size differs from the one from the storage: "${filePath}", expected size: ${file.fileSize}, actual size: ${realFileSize}`
          );
          if (!yesToAllSizeDiffers) {
            const answer = await askUser(`Ignore the difference? [Y/a/n]`);
            if (
              !yesRegExp.test(answer) &&
              !allRegExp.test(answer) &&
              answer !== ""
            ) {
              throw new Abort();
            }
            if (allRegExp.test(answer)) {
              yesToAllSizeDiffers = true;
            }
          }
        }
      } catch (e) {
        // This shouldn't happen, so just exit
        throw e;
      }
      const normalizedMarks = normalize
        ? normalizeMarks(file.marklist)
        : file.marklist;
      validatedFiles.push({
        ...file,
        fileSize: realFileSize,
        marklist: enumarateMarks(normalizedMarks, markId),
      });
      markId = markId + normalizedMarks.length;
    }

    validatedDirFilesMap.set(dir, validatedFiles);
  }
  return validatedDirFilesMap;
}

function writeNewStorages(dirFilesMap: DirFilesMap) {
  for (const [dir, files] of dirFilesMap.entries()) {
    const newStorage: AudipoMarksStorage = {
      // We don't want to make any assumptions about the purpose of this splitting operation,
      // so we create portable storages, w/o any information about their current locations.
      externalStorageDirectory: "",
      files,
    };
    const storageFilePath = path.join(dir, LOCAL_MARKS_FILENAME);

    log(`Writing file: "${storageFilePath}"`);
    fs.writeFileSync(storageFilePath, JSON.stringify(newStorage, null, 2));
  }
}
