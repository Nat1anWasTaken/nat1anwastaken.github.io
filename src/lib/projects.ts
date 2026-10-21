import { getCollection, type CollectionEntry } from "astro:content";

/** All projects in display order. */
export const getProjects = async () =>
  (await getCollection("projects")).sort((a, b) => a.data.order - b.data.order);

/** The URL slug: the file name without its ordering prefix, e.g. `07-when2meet` → `when2meet`. */
export const projectSlug = (project: CollectionEntry<"projects">) =>
  project.id.replace(/^\d+-/, "");

/** The project's own page, which the Work cards link to. */
export const projectPath = (project: CollectionEntry<"projects">) =>
  `/work/${projectSlug(project)}/`;

/** A plain-text summary for meta descriptions: the entry's body, which is one paragraph. */
export const projectDescription = (project: CollectionEntry<"projects">) =>
  (project.body ?? "").trim().replace(/\s+/g, " ");
