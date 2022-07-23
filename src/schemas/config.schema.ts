import { z } from "zod";
import { AudipoMarksConfig } from "../models/config.model";

export const schemaAudipoMarksConfig: z.ZodType<AudipoMarksConfig> = z
  .object({
    ffmpeg: z.object({
      duration: z.number(),
      noise: z.number(),
    }),
  })
  .strict();
