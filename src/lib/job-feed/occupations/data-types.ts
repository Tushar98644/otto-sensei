export type OccupationData = {
  // Where the data comes from, as the licences ask it to be credited.
  source: string;
  codes: string[];
  titles: string[];
  names: string[];
  zones: number[];
  close: number[][];
  related: number[][];
  aliases: string[];
};
