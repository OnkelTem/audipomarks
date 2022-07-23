import fs from "fs";
import path from "path";

export const GLOBAL_MARKS_FILENAME = "global.audipomark";
export const LOCAL_MARKS_FILENAME = "local.audipomark";
export const LOCAL_CONFIG_FILE = ".audipomarks";
export const DEFAULT_DURATION_MS = 1000;
export const DEFAULT_NOISE_DB = 50;

// Minimum distance between marks
export const MIN_MARK_DISTANCE_MS = 1000;

export function isRecord(a: unknown): a is Record<string, unknown> {
  return typeof a === "object" && a != null;
}

export const BetterObject: {
  keys<T extends Record<string, unknown>>(object: T): (keyof T)[];
  values<T extends Record<string, unknown>>(Object: T): T[keyof T][];
} = {
  keys: (o) => Object.keys(o) as any,
  values: (o) => Object.values(o) as any,
};

export function assertIsString(arg: any): asserts arg is string {
  if (arg == null || typeof arg !== "string") {
    throw new Error("Data is empty");
  }
}

/**
 * Checks if dir belongs to the current fil etree, i.e. it local
 * @param dir
 * @returns
 */
export function isChildOfPath(dir: string, parent: string) {
  const relative = path.relative(parent, dir);
  return (
    relative != "" && !relative.startsWith("..") && !path.isAbsolute(relative)
  );
}

export function directoryExists(dirPath: string) {
  try {
    fs.accessSync(dirPath, fs.constants.R_OK);
  } catch (e) {
    return false;
  }
  if (!fs.statSync(dirPath).isDirectory()) {
    return false;
  }
  return true;
}

export function fileExists(filePath: string) {
  try {
    fs.accessSync(filePath, fs.constants.R_OK);
  } catch (e) {
    return false;
  }
  if (!fs.statSync(filePath).isFile()) {
    return false;
  }
  return true;
}

export function log(...msg: any[]) {
  // eslint-disable-next-line
  console.log(...msg);
}

export function err(...msg: any[]) {
  // eslint-disable-next-line
  console.error(...msg);
}
