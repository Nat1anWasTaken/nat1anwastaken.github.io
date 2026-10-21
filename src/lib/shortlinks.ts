import Papa from "papaparse";
import { site } from "../data/site";

/** A row of the short-link sheet, exported from the old Sink shortener. */
export interface ShortLink {
  slug: string;
  url: string;
  /** Append the request's query string to `url` when redirecting. */
  redirectWithQuery: boolean;
}

interface Row {
  slug?: string;
  url?: string;
  redirectWithQuery?: string;
}

/** The sheet's published CSV, read at runtime by the 404 page. */
export const shortLinksCsvUrl = `https://docs.google.com/spreadsheets/d/e/${site.shortLinks.sheetId}/pub?output=csv`;

/** Strips leading and trailing slashes, so `/cal/` and `cal` match the same slug. */
export const normalizeSlug = (slug: string) => slug.replace(/^\/+|\/+$/g, "");

export function parseShortLinks(csv: string): ShortLink[] {
  const { data } = Papa.parse<Row>(csv, { header: true, skipEmptyLines: true });

  return data
    .map((row) => ({
      slug: normalizeSlug(row.slug?.trim() ?? ""),
      url: row.url?.trim() ?? "",
      redirectWithQuery: row.redirectWithQuery?.trim().toUpperCase() === "TRUE",
    }))
    .filter((link) => link.slug !== "" && link.url !== "");
}

export async function fetchShortLinks(): Promise<ShortLink[]> {
  const response = await fetch(shortLinksCsvUrl);
  if (!response.ok) {
    throw new Error(
      `Fetching short links failed: ${response.status} ${response.statusText}`,
    );
  }

  return parseShortLinks(await response.text());
}

/**
 * Where `link` sends a request with the given query string (`location.search`),
 * or `undefined` unless the destination is an http(s) URL.
 */
export function destination(link: ShortLink, search: string) {
  let url: URL;
  try {
    url = new URL(link.url);
  } catch {
    return undefined;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;

  const query = search.replace(/^\?/, "");
  if (!link.redirectWithQuery || query === "") return link.url;

  // Splice the query in as text: rebuilding it through URLSearchParams would
  // re-encode the destination's own parameters.
  const [base, hash] = splitAt(link.url, "#");
  const separator = base.includes("?") ? (/[?&]$/.test(base) ? "" : "&") : "?";
  return `${base}${separator}${query}${hash === undefined ? "" : `#${hash}`}`;
}

function splitAt(text: string, char: string): [string, string | undefined] {
  const index = text.indexOf(char);
  return index === -1
    ? [text, undefined]
    : [text.slice(0, index), text.slice(index + 1)];
}
