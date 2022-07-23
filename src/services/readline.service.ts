import { createInterface } from "readline";

export const yesRegExp = /^(y|yes)$/i;
export const allRegExp = /^(a|all)$/i;

export function askUser(q: string) {
  return new Promise<string>((r) => {
    const readline = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    readline.question(q, (a) => {
      readline.close();
      r(a);
    });
  });
}
