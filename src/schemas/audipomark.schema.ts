import { z } from "zod";
import {
  AudipoMark,
  AudipoMarksFile,
  AudipoMarksStorage,
} from "../models/audipomark.model";

export const schemaAudipoMark: z.ZodType<AudipoMark> = z
  .object({
    id: z.number(),
    pos: z.number(),
    followingRangeState: z.number().optional(),
    state: z.number().optional(),
    tag: z.string().optional(),
    type: z.number().optional(),
  })
  .strict();

export const schemaAudipoMarksFile: z.ZodType<AudipoMarksFile> = z
  .object({
    fileSize: z.number(),
    filepath: z.string(),
    marklist: schemaAudipoMark.array(),
  })
  .strict();

export const schemaAudipoMarksStorage: z.ZodType<AudipoMarksStorage> = z
  .object({
    externalStorageDirectory: z.string(),
    files: schemaAudipoMarksFile.array(),
  })
  .strict();
