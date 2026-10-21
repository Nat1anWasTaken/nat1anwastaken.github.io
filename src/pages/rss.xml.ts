import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { site } from "../data/site";
import { getPosts, postPath } from "../lib/posts";

export const GET: APIRoute = async (context) =>
  rss({
    title: site.blog.title,
    description: site.blog.description,
    site: context.site!,
    items: (await getPosts()).map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: postPath(post),
      categories: post.data.tags,
    })),
  });
