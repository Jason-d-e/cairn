# Retrieval evaluation, real student questions, 2026-11-11

| Method | Questions | Hit@1 | Hit@3 | Hit@5 | MRR@10 |
| --- | --- | --- | --- | --- | --- |
| keyword (BM25) | zh (8) | 1 | 2 | 2 | 0.188 |
| keyword (BM25) | en (6) | 0 | 3 | 4 | 0.256 |
| keyword (BM25) | ms (1) | 0 | 0 | 0 | 0 |
| keyword (BM25) | all (15) | 1 | 5 | 6 | 0.202 |
| vector | zh (8) | 3 | 4 | 5 | 0.469 |
| vector | en (6) | 6 | 6 | 6 | 1 |
| vector | ms (1) | 0 | 1 | 1 | 0.5 |
| vector | all (15) | 9 | 11 | 12 | 0.683 |
| hybrid, Orama 0.4/0.6 | zh (8) | 2 | 4 | 4 | 0.375 |
| hybrid, Orama 0.4/0.6 | en (6) | 0 | 5 | 5 | 0.417 |
| hybrid, Orama 0.4/0.6 | ms (1) | 0 | 1 | 1 | 0.5 |
| hybrid, Orama 0.4/0.6 | all (15) | 2 | 10 | 10 | 0.4 |
| hybrid, RRF | zh (8) | 3 | 4 | 4 | 0.438 |
| hybrid, RRF | en (6) | 6 | 6 | 6 | 1 |
| hybrid, RRF | ms (1) | 0 | 1 | 1 | 0.5 |
| hybrid, RRF | all (15) | 9 | 11 | 11 | 0.667 |
| vector + rerank | zh (8) | 2 | 5 | 5 | 0.417 |
| vector + rerank | en (6) | 5 | 6 | 6 | 0.889 |
| vector + rerank | ms (1) | 0 | 0 | 1 | 0.2 |
| vector + rerank | all (15) | 7 | 11 | 12 | 0.591 |
| RRF + rerank | zh (8) | 3 | 4 | 5 | 0.463 |
| RRF + rerank | en (6) | 6 | 6 | 6 | 1 |
| RRF + rerank | ms (1) | 0 | 0 | 1 | 0.2 |
| RRF + rerank | all (15) | 9 | 10 | 12 | 0.66 |
| translate + vector + rerank | zh (8) | 4 | 7 | 7 | 0.667 |
| translate + vector + rerank | en (6) | 5 | 6 | 6 | 0.889 |
| translate + vector + rerank | ms (1) | 0 | 0 | 1 | 0.2 |
| translate + vector + rerank | all (15) | 9 | 13 | 14 | 0.724 |
