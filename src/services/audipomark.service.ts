import { AudipoMarksStorage } from "../models/audipomark.model";
import { schemaAudipoMarksStorage } from "../schemas/audipomark.schema";
import { assertIsString } from "../utils";
import { assertNoZodErrors } from "./validate.service";
import { readFileSync } from "fs";

export function readStorage(marksStorageFile: string) {
  const rawData = readFileSync(marksStorageFile, "utf-8");
  assertIsString(rawData);
  const data = JSON.parse(rawData);
  const parsed = schemaAudipoMarksStorage.safeParse(data);
  assertNoZodErrors<AudipoMarksStorage>(parsed);
  return parsed.data;
}
