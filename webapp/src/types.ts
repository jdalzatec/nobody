export interface Annotation {
  id: string;
  text: string;
  comment: string;
  sourceStart: number;
  sourceEnd: number;
}

export interface Doc {
  id: string;
  title: string;
  filename: string;
  dirPath: string;
  dirLabel: string;
}
