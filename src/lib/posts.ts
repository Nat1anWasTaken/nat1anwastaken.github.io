import { getCollection, type CollectionEntry } from "astro:content";

export type Post = CollectionEntry<"blog">;

/** Published posts, newest first. Drafts only show on the dev server. */
export const getPosts = async () =>
  (
    await getCollection(
      "blog",
      ({ data }) => import.meta.env.DEV || !data.draft,
    )
  ).sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

export const postPath = (post: Post) => `/blog/${post.id}/`;

/** The original a post was translated from, or the post itself. */
export const originalId = (post: Post) =>
  post.data.translationOf?.id ?? post.id;

/** Other languages of a post among `posts`: its original and the original's translations. */
export const getTranslations = (post: Post, posts: Post[]) =>
  posts.filter(
    (other) => other.id !== post.id && originalId(other) === originalId(post),
  );

/** A short date, e.g. "Oct 22, 2026". Frontmatter dates parse as UTC midnight. */
export const formatDate = (date: Date) =>
  date.toLocaleDateString("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
