// The shape of data.json, written by scripts/occupations-build.ts. Lists are parallel: entry i of
// each describes the occupation codes[i].
export type OccupationData = {
  // Where the data comes from, as the licences ask it to be credited.
  source: string;
  // O*NET-SOC 2019 codes: "29-1141.00".
  codes: string[];
  // O*NET's own titles: "Registered Nurses".
  titles: string[];
  // One role in plain words, for the card: "Registered Nurse".
  names: string[];
  // O*NET Job Zone 1-5 (little to extensive preparation), 0 when O*NET gives none.
  zones: number[];
  // O*NET Related Occupations, as indexes: the closest five ("Primary-Short") and the next five
  // ("Primary-Long"). The ten "Supplemental" ones are too loose to rank by.
  close: number[][];
  related: number[][];
  // Lookup keys (titleKey) that name the occupation, joined by "|".
  aliases: string[];
};
