export type MediaFile = {
  uuid: string;
  name: string;
  size: number;
  mime: string;
  codecs: string;
  duration: number;
  has_thumb: boolean;
  caption: string;
  created_at: number;
  series: string | null;
  season: number;
  episode: number;
  source: "telegram";
};

export type SeriesMeta = {
  name: string;
  episodes: number;
  seasons: number[];
  latest: number;
  description: string;
  year: string;
  genre: string;
  has_poster: boolean;
  has_banner: boolean;
};

export type SeriesGroup = {
  name: string;
  eps: MediaFile[];
  latest: number;
  poster: string | null;
  banner: string | null;
  thumbUuid: string | null;
};

export type SessionUser = {
  id: number;
  name: string;
  tok: string;
  exp: number;
  admin?: boolean;
};

export type Progress = Record<string, { pos: number; dur: number }>;
