import path from "path";
import { directoryExists, log, RecursivePartial } from "../utils";
import { promises as fsPromises, statSync, writeFileSync } from "fs";
import { isAudioFile } from "../services/filetype.service";
import { ffmpeg, renderFFmpegParams } from "../services/ffmpeg.service";
import { MarkError } from "../errors";
import { AudipoMark, AudipoMarksFile, AudipoMarksStorage } from "../models/audipomark.model";
import { normalizeMarks, readConfig } from "../services/audipomark.service";
import { AudipoMarksConfig } from "../models/config.model";
import { DEFAULT_DURATION_MS, DEFAULT_NOISE_DB, LOCAL_CONFIG_FILE, LOCAL_MARKS_FILENAME, MARK_CLEARANCE } from "../constants";

export type FFmpegFilterOptions = {
  duration: number;
  noise: number;
};

const defaultConfig: AudipoMarksConfig = {
  ffmpeg: {
    duration: DEFAULT_DURATION_MS,
    noise: DEFAULT_NOISE_DB,
  },
};

export default async function (workingDir: string, recursive: boolean, config: RecursivePartial<AudipoMarksConfig>) {
  const absoluteWorkingDir = path.resolve(workingDir);

  if (!directoryExists(workingDir)) {
    throw new MarkError(`Directory not found: "${directoryExists}"`);
  }

  if (recursive) {
    for await (const d of getDirs(absoluteWorkingDir)) {
      await processDir(d, config);
    }
  }
  // Process current directory in any case
  await processDir(absoluteWorkingDir, config);
}

async function processDir(dir: string, configOverride: RecursivePartial<AudipoMarksConfig>) {
  log(`Processing directory "${dir}"`);
  const audioFiles: string[] = [];
  let configFile: string | undefined = undefined;

  // Analyze <dir> and find both audio files and config file
  for await (const f of getFilesFromDir(dir)) {
    if (isAudioFile(f)) {
      audioFiles.push(f);
    }
    if (path.basename(f) === LOCAL_CONFIG_FILE) {
      configFile = f;
    }
  }
  if (configFile != null) {
    log(`Found config file "${path.basename(configFile)}"`);
  }
  const config = configFile != null ? readConfig(configFile) : defaultConfig;

  // Override default and file config with the one from the parameters, if any
  if (configOverride.ffmpeg != null) {
    if (configOverride.ffmpeg.duration != null) {
      config.ffmpeg.duration = configOverride.ffmpeg.duration;
    }
    if (configOverride.ffmpeg.noise != null) {
      config.ffmpeg.noise = configOverride.ffmpeg.noise;
    }
  }
  // Override the config with the passed parameters

  log(`Using FFmpeg parameters: ` + renderFFmpegParams(config.ffmpeg));

  // Mark ID counter
  let markId = 1;
  const audipoMarksFiles: AudipoMarksFile[] = [];

  // Process audiofiles
  for (const f of audioFiles) {
    const { stdout } = await ffmpeg([
      "-i",
      f,
      "-af",
      `silencedetect=n=-${config.ffmpeg.noise}dB:d=${config.ffmpeg.duration / 1000},ametadata=mode=print:file=-`,
      "-f",
      "null",
      "-",
    ]);
    const interval: [number, number] = [-1, -1];
    const marks: AudipoMark[] = [];

    for (const line of stdout.split(/\r?\n/).filter((l) => /^lavfi/.test(l))) {
      const [k, v] = line.split("=");
      switch (k) {
        case "lavfi.silence_start":
          interval[0] = Math.round(parseFloat(v) * 1000);
          break;
        case "lavfi.silence_end":
          interval[1] = Math.round(parseFloat(v) * 1000);
          break;
        case "lavfi.silence_duration":
          if (interval[0] !== -1 && interval[1] !== -1) {
            const diff = interval[1] - interval[0];
            const pos =
              diff > MARK_CLEARANCE
                ? // Add some space before audio data
                  interval[1] - MARK_CLEARANCE
                : // otherwise - set mark in the middle of the silence
                  interval[0] + Math.round(diff / 2);

            marks.push({
              id: markId++,
              pos,
            });

            // Reset interval
            interval[0] = -1;
            interval[1] = -1;
          }
          break;
      }
    }

    // Normlize marks
    const normalizedMarks = normalizeMarks(marks);

    log(`File ${path.basename(f)}: found ${normalizedMarks.length} marks.`);
    audipoMarksFiles.push({
      filepath: path.relative(dir, f),
      fileSize: statSync(f).size,
      marklist: normalizedMarks,
    });
  }

  const audipoMarksStorage: AudipoMarksStorage = {
    // We don't want to make any assumptions about the purpose of this marking operation,
    // so we create portable storages, w/o any information about their current locations.
    externalStorageDirectory: "",
    files: audipoMarksFiles,
  };
  const storageFilePath = path.join(dir, LOCAL_MARKS_FILENAME);

  if (audipoMarksStorage.files.length > 0) {
    log(`Writing audipomark file: "${path.basename(storageFilePath)}"`);
    writeFileSync(storageFilePath, JSON.stringify(audipoMarksStorage, null, 2));
    // Save config
    const configFilePath = path.join(dir, LOCAL_CONFIG_FILE);
    log(`Writing config file: "${path.basename(configFilePath)}"`);
    writeFileSync(configFilePath, JSON.stringify(config, null, 2));
  }
}

async function* getFilesFromDir(dir: string): AsyncGenerator<string> {
  const dirents = await fsPromises.readdir(dir, { withFileTypes: true });

  for (const dirent of dirents) {
    const res = path.resolve(dir, dirent.name);
    if (!dirent.isDirectory()) {
      yield res;
    }
  }
}

async function* getDirs(dir: string): AsyncGenerator<string> {
  const dirents = await fsPromises.readdir(dir, { withFileTypes: true });

  for (const dirent of dirents) {
    const res = path.resolve(dir, dirent.name);
    if (dirent.isDirectory()) {
      yield res;
      yield* getDirs(res);
    }
  }
}
