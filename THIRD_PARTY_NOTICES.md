# Third-party components and sources

Cairn reuses existing open-source work wherever it can. This file lists every component and source used, as of 2026-11-09.

## The corpus

| Source | License | Notice |
| --- | --- | --- |
| [w3c/wcag](https://github.com/w3c/wcag), commit `d1e0639` (2 November 2026): the WCAG 2.2 success criteria and their Understanding documents | [W3C Document License](https://www.w3.org/copyright/document-license-2023/) | Copyright © 2026 World Wide Web Consortium. The passages in `app/data/` and every quote shown by Cairn are reproduced unchanged, with a link to the source document. No part of the text has been modified. |

## Models (downloaded on first run into `app/data/models/`, run locally)

| Model | License | Copyright | Used for |
| --- | --- | --- | --- |
| [Xenova/multilingual-e5-small](https://huggingface.co/Xenova/multilingual-e5-small) (ONNX, q8), converted from [intfloat/multilingual-e5-small](https://huggingface.co/intfloat/multilingual-e5-small) | MIT | Microsoft (model); Xenova (conversion) | Embedding the passages and the question (384 dimensions) |
| [Xenova/bge-reranker-base](https://huggingface.co/Xenova/bge-reranker-base) (ONNX, q8), converted from [BAAI/bge-reranker-base](https://huggingface.co/BAAI/bge-reranker-base) | MIT | Beijing Academy of Artificial Intelligence (model); Xenova (conversion) | Reranking the 20 candidate passages |

Answers are written by Claude Haiku 5.5 through the [Anthropic API](https://docs.anthropic.com/) under its terms of service. The key is the operator's own.

## Server dependencies (`app/package.json`, exact versions)

| Component | Version | License | Copyright | Used for |
| --- | --- | --- | --- | --- |
| [@anthropic-ai/sdk](https://github.com/anthropics/anthropic-sdk-typescript) | 1.6.0 | Apache-2.0 | Anthropic | Calling the Claude API with structured output |
| [express](https://github.com/expressjs/express) | 5.3.0 | MIT | the Express contributors | HTTP server |
| [@orama/orama](https://github.com/oramasearch/orama) | 3.1.18 | Apache-2.0 | (c) OramaSearch Inc. | BM25, vector and hybrid search over the passages |
| [@orama/plugin-data-persistence](https://github.com/oramasearch/orama) | 3.1.18 | Apache-2.0 | (c) OramaSearch Inc. | Saving and loading the index as a JSON file |
| [@huggingface/transformers](https://github.com/huggingface/transformers.js) | 4.3.2 | Apache-2.0 | (c) Hugging Face | Running the embedding and reranking models locally (ONNX Runtime) |
| [@langchain/textsplitters](https://github.com/langchain-ai/langchainjs) | 1.0.2 | MIT | (c) LangChain, Inc. | Splitting the W3C text into passages (900 characters, 150 overlap) |
| [cheerio](https://github.com/cheeriojs/cheerio) | 1.2.0 | MIT | (c) 2022 The Cheerio contributors | Parsing the W3C HTML sources |

## Interface dependencies (`app/web/package.json`, bundled into `app/web/dist`)

| Component | Version | License | Copyright | Used for |
| --- | --- | --- | --- | --- |
| [React](https://github.com/facebook/react) and react-dom | 19.3.1 | MIT | (c) Meta Platforms, Inc. and affiliates | Interface framework |
| [Mantine](https://github.com/mantinedev/mantine): core, hooks | 9.7.5 | MIT | (c) 2021 Vitaly Rtishchev | Accessible controls: inputs, buttons, segmented controls, menus |
| [Tabler Icons](https://github.com/tabler/tabler-icons) (@tabler/icons-react) | 3.51.0 | MIT | (c) 2020-2026 Paweł Kuna | Icons |
| [i18next](https://github.com/i18next/i18next) | 27.0.1 | MIT | (c) 2011-present i18next | Chinese / English interface text |
| [react-i18next](https://github.com/i18next/react-i18next) | 18.0.1 | MIT | (c) 2015-present i18next | Connects i18next to React |

Build tools (not shipped): Vite 8, TypeScript 7, PostCSS with postcss-preset-mantine, oxlint.

## Fonts (loaded at runtime from Google Fonts, not redistributed)

| Font | License | Designer / copyright | Used for |
| --- | --- | --- | --- |
| [Funnel Display](https://fonts.google.com/specimen/Funnel+Display) | SIL Open Font License 1.1 | Copyright 2024 The Funnel Project Authors (https://github.com/Dicotype/Funnel); designed by NORD ID and Kristian Möller | Headings and statement figures |
| [Funnel Sans](https://fonts.google.com/specimen/Funnel+Sans) | SIL Open Font License 1.1 | Copyright 2024 The Funnel Project Authors (https://github.com/Dicotype/Funnel); designed by NORD ID and Kristian Möller | Body text, labels, criterion numbers |
| [Noto Sans SC](https://fonts.google.com/noto/specimen/Noto+Sans+SC) | SIL Open Font License 1.1 | (c) Google LLC and the Noto Project Authors | Chinese text (Funnel Display and Funnel Sans have no CJK glyphs) |

## Design guidance (rules followed while building the interface; no code redistributed)

| Guidance | License | Notice |
| --- | --- | --- |
| [Hallmark](https://github.com/hallmark-design/hallmark), theme "Refract" | MIT | Copyright (c) 2026 Hallmark contributors |
| [Emil Kowalski's design engineering skills](https://github.com/emilkowalski/skills) | MIT | Copyright (c) 2026 Emil Kowalski |
| [Impeccable](https://github.com/pbakaus/impeccable) | Apache-2.0 | Copyright (c) Paul Bakaus |
| [UX Writing skill](https://github.com/content-designer/ux-writing-skill) | MIT | Copyright (c) 2026 Christopher Greer |
| [Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines) | MIT | Copyright (c) 2025 Vercel Labs |

## Checks (development only)

| Tool | Version | License | Used for |
| --- | --- | --- | --- |
| [axe-core](https://github.com/dequelabs/axe-core) | 4.10.2 | MPL-2.0 | Accessibility checks on every screen |
| [puppeteer-core](https://github.com/puppeteer/puppeteer) | 24 | Apache-2.0 | Driving a local Chrome for the checks and screenshots |

## From our own TraceDesk project

The quote-verification approach (`normalizeForMatch`, `verifyQuote`) and the API client pattern are reused from [TraceDesk Lite](https://github.com/Jason-d-e/tracedesk-lite), by the same team.
