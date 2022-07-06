export type AudipoMarksStorage = {
  externalStorageDirectory: string;
  files: AudipoMarksFile[];
};

export type AudipoMarksFile = {
  fileSize: number;
  filepath: string;
  marklist: AudipoMark[];
};

export type AudipoMark = {
  id: number;
  pos: number;
  followingRangeState?: number;
  state?: number;
  tag?: string;
  type?: number;
};
