import type { APIRoute, GetStaticPaths, InferGetStaticPropsType } from "astro";
import { renderCard } from "../../lib/og";
import { getPosts } from "../../lib/posts";

/** Social cards for posts without a cover, which share theirs instead. */
export const getStaticPaths = (async () =>
  (await getPosts())
    .filter((post) => !post.data.cover)
    .map((post) => ({
      params: { id: post.id },
      props: { post },
    }))) satisfies GetStaticPaths;

type Props = InferGetStaticPropsType<typeof getStaticPaths>;

export const GET: APIRoute<Props> = async ({ props }) =>
  new Response(new Uint8Array(await renderCard(props.post)), {
    headers: { "Content-Type": "image/png" },
  });
