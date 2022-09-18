import { AudipoMark, AudipoMarksStorage } from "../models/audipomark.model";
import { schemaAudipoMarksStorage } from "../schemas/audipomark.schema";
import { assertIsString } from "../utils";
import { assertNoZodErrors } from "./validate.service";
import { readFileSync } from "fs";
import { AudipoMarksConfig } from "../models/config.model";
import { schemaAudipoMarksConfig } from "../schemas/config.schema";
import { MIN_MARK_DISTANCE_MS } from "../constants";

export function readStorage(marksStorageFile: string) {
  const rawData = readFileSync(marksStorageFile, "utf-8");
  assertIsString(rawData);
  const data = JSON.parse(rawData);
  const parsed = schemaAudipoMarksStorage.safeParse(data);
  assertNoZodErrors<AudipoMarksStorage>(parsed);
  return parsed.data;
}

export function enumarateMarks(
  marks: AudipoMark[],
  startWithId: number
): AudipoMark[] {
  return marks.map((mark, index) => ({
    ...mark,
    id: startWithId + index,
  }));
}

export function normalizeMarks(marks: AudipoMark[]): AudipoMark[] {
  let lastMarkPos = -1;
  const normalizedMarks: AudipoMark[] = [];
  for (const mark of marks) {
    if (lastMarkPos === -1 || mark.pos - lastMarkPos > MIN_MARK_DISTANCE_MS) {
      normalizedMarks.push({ ...mark });
      lastMarkPos = mark.pos;
    }
  }
  return normalizedMarks;
}

export function readConfig(configFile: string): AudipoMarksConfig {
  const rawData = readFileSync(configFile, "utf-8");
  assertIsString(rawData);
  const data = JSON.parse(rawData);
  const parsed = schemaAudipoMarksConfig.safeParse(data);
  assertNoZodErrors<AudipoMarksConfig>(parsed);
  return parsed.data;
}
