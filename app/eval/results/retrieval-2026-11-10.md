# Retrieval evaluation, 2026-11-10

| Method | Questions | Hit@1 | Hit@3 | Hit@5 | MRR@10 |
| --- | --- | --- | --- | --- | --- |
| keyword (BM25) | en (25) | 7 | 15 | 18 | 0.455 |
| keyword (BM25) | zh (20) | 4 | 7 | 7 | 0.275 |
| keyword (BM25) | all (45) | 11 | 22 | 25 | 0.375 |
| vector | en (25) | 17 | 21 | 24 | 0.786 |
| vector | zh (20) | 9 | 14 | 17 | 0.613 |
| vector | all (45) | 26 | 35 | 41 | 0.709 |
| hybrid, Orama 0.4/0.6 | en (25) | 13 | 19 | 19 | 0.638 |
| hybrid, Orama 0.4/0.6 | zh (20) | 9 | 12 | 13 | 0.529 |
| hybrid, Orama 0.4/0.6 | all (45) | 22 | 31 | 32 | 0.59 |
| hybrid, RRF | en (25) | 17 | 23 | 24 | 0.803 |
| hybrid, RRF | zh (20) | 9 | 13 | 16 | 0.577 |
| hybrid, RRF | all (45) | 26 | 36 | 40 | 0.703 |
| vector + rerank | en (25) | 18 | 22 | 25 | 0.823 |
| vector + rerank | zh (20) | 11 | 17 | 18 | 0.685 |
| vector + rerank | all (45) | 29 | 39 | 43 | 0.762 |
| RRF + rerank | en (25) | 17 | 22 | 24 | 0.8 |
| RRF + rerank | zh (20) | 11 | 17 | 18 | 0.696 |
| RRF + rerank | all (45) | 28 | 39 | 42 | 0.754 |
| translate + vector + rerank | en (25) | 18 | 22 | 25 | 0.823 |
| translate + vector + rerank | zh (20) | 16 | 19 | 19 | 0.858 |
| translate + vector + rerank | all (45) | 34 | 41 | 44 | 0.839 |
