---
title: 文章能做到的所有事
description: 這個部落格支援的 Markdown 功能總覽，作為草稿保留，用來測試樣式。
pubDate: 2026-10-22
lang: zh-TW
translationOf: writing-guide
tags: [meta, markdown]
draft: true
---

這篇是草稿，只會出現在開發伺服器上。文字可以是**粗體**、_斜體_、~~刪除線~~ 與 `行內程式碼`。

## 程式碼

```ts title="src/lib/posts.ts"
export const getPosts = async () => (await getCollection("blog")).sort(byDate);
```

## 提示框

:::note[小提醒]
Markdown 文章用 `:::note`、`:::tip`、`:::warning` 或 `:::danger` 寫提示框。
:::

:::warning
沒有標題時，只會顯示類型。
:::

## 數學

行內數學 $a^2 + b^2 = c^2$，以及獨立一行的公式：

$$
\sum_{k=1}^{n} k = \frac{n(n+1)}{2}
$$

## 圖片

![STA 網站的截圖](../../assets/projects/sta/2.jpg)
