export interface Annotation {
  id: string;
  text: string;
  comment: string;
  range: SerializedRange;
}

export interface SerializedRange {
  startContainerPath: number[];
  startOffset: number;
  endContainerPath: number[];
  endOffset: number;
}
