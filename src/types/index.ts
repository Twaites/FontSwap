export interface GoogleFont {
  family: string;
  category: string;
  variants: string[];
  popularityRank?: number;
  trendingRank?: number;
  dateRank?: number;
}

export interface DetectedFonts {
  [fontName: string]: number; // count
}

export interface FontMapping {
  original: string;
  replacement: string;
  active: boolean;
  color: string; // highlight color
}
