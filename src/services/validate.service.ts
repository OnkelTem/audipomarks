import { SafeParseReturnType, SafeParseSuccess } from "zod";
import { BetterObject, isRecord, StorageError } from "../utils";

export function formatZodErrors(
  formatted: Record<string, unknown>,
  path = ""
): string {
  let output = "";
  if (
    formatted["_errors"] != null &&
    Array.isArray(formatted["_errors"]) &&
    formatted["_errors"].length > 0
  ) {
    output += `${path}: ` + formatted["_errors"].join("; ") + "\n";
  }
  const props = BetterObject.keys(formatted);
  props.forEach((prop) => {
    if (prop !== "_errors") {
      const item = formatted[prop];
      if (isRecord(item)) {
        output += formatZodErrors(
          item,
          `${path !== "" ? path + "." : ""}${prop}`
        );
      }
    }
  });
  return output;
}

export function assertNoZodErrors<T>(
  parsed: SafeParseReturnType<T, T>
): asserts parsed is SafeParseSuccess<T> {
  if (!parsed.success) {
    throw new StorageError(formatZodErrors(parsed.error.format()));
  }
}
