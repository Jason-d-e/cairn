# Retrieval evaluation, 2026-11-09

| Method | Questions | Hit@1 | Hit@3 | Hit@5 | MRR@10 |
| --- | --- | --- | --- | --- | --- |
| keyword (BM25) | en (20) | 5 | 9 | 12 | 0.38 |
| keyword (BM25) | zh (20) | 1 | 1 | 1 | 0.05 |
| keyword (BM25) | all (40) | 6 | 10 | 13 | 0.215 |
| vector | en (20) | 15 | 20 | 20 | 0.867 |
| vector | zh (20) | 13 | 18 | 19 | 0.779 |
| vector | all (40) | 28 | 38 | 39 | 0.823 |
| hybrid, Orama 0.4/0.6 | en (20) | 9 | 13 | 15 | 0.582 |
| hybrid, Orama 0.4/0.6 | zh (20) | 14 | 19 | 19 | 0.817 |
| hybrid, Orama 0.4/0.6 | all (40) | 23 | 32 | 34 | 0.699 |
| hybrid, Orama 0.2/0.8 | en (20) | 9 | 15 | 16 | 0.621 |
| hybrid, Orama 0.2/0.8 | zh (20) | 14 | 19 | 19 | 0.817 |
| hybrid, Orama 0.2/0.8 | all (40) | 23 | 34 | 35 | 0.719 |
| hybrid, RRF | en (20) | 10 | 18 | 20 | 0.717 |
| hybrid, RRF | zh (20) | 13 | 19 | 19 | 0.792 |
| hybrid, RRF | all (40) | 23 | 37 | 39 | 0.754 |
| vector + rerank | en (20) | 18 | 20 | 20 | 0.942 |
| vector + rerank | zh (20) | 14 | 19 | 19 | 0.817 |
| vector + rerank | all (40) | 32 | 39 | 39 | 0.879 |
| RRF + rerank | en (20) | 17 | 20 | 20 | 0.908 |
| RRF + rerank | zh (20) | 14 | 19 | 19 | 0.817 |
| RRF + rerank | all (40) | 31 | 39 | 39 | 0.863 |
