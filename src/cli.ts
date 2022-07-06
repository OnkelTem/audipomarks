import { hideBin } from "yargs/helpers";
import app from "./app";

(async () => {
  await app(hideBin(process.argv)).argv;
  process.exit(0);
})();
