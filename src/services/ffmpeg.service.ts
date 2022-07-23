import which from "which";
import { execFile } from "child_process";
import util from "util";
import { FFmpegError } from "../errors";

const execFileAsync = util.promisify(execFile);

function locateFFmpeg() {
  const ffmpegPath = which.sync("ffmpeg", { nothrow: true });
  if (ffmpegPath == null) {
    throw new FFmpegError(
      "FFmpeg cannot be found on your system. Please install it."
    );
  }
  return ffmpegPath;
}

let ffmpegPath: string;

export async function ffmpeg(params: string[]) {
  if (ffmpegPath == null) {
    ffmpegPath = locateFFmpeg();
  }
  return await execFileAsync(ffmpegPath, params);
}
