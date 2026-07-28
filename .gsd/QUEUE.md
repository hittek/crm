# Queue

- 🔄 **M011-s2bgo9: Local Embeddings via Ollama Remove Voyage AI Dependency**
  > ⚠️ Precondition: server must have ≥2GB free RAM (currently ~1.2GB, swap 100% full). Plan: add `ollama` service to docker-compose, use `nomic-embed-text` (768 dim), migrate schema from vector(1024)→768, re-index 18+ chunks. VOYAGE_API_KEY can then be removed. See D002 for context.
