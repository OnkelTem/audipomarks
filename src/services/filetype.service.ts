import { extname } from "path";

const audioFileExtRegExp = /^\.(mp3|ogg|aac|wav)$/i;

export function isAudioFile(filename: string) {
  return audioFileExtRegExp.test(extname(filename));
}
