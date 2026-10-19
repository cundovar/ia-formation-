import os
import secrets
import uuid
from functools import lru_cache
from fastapi import FastAPI, Header, HTTPException
from fastembed import TextEmbedding
from pydantic import BaseModel, Field
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, FieldCondition, Filter, MatchValue, PointStruct, VectorParams

app = FastAPI(docs_url=None, redoc_url=None)
COLLECTION = "formation_ia_courses"
# Qdrant n'accepte que des entiers ou des UUID : « 12-1 » (cours-passage) devient un UUID stable
def point_id(value): return str(uuid.uuid5(uuid.NAMESPACE_URL, f"formation-ia:{value}"))

def auth(value):
    expected = f"Bearer {os.environ['RAG_SERVICE_TOKEN']}"
    if value is None or not secrets.compare_digest(value, expected): raise HTTPException(401, "Non autorisé")
@lru_cache
def model(): return TextEmbedding(model_name=os.getenv("EMBEDDING_MODEL", "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"), cache_dir="/models")
@lru_cache
def store(): return QdrantClient(url=os.environ["QDRANT_URL"], api_key=os.environ["QDRANT_API_KEY"])
def collection():
    dimension = len(next(model().embed(["test"])))
    if not store().collection_exists(COLLECTION): store().create_collection(COLLECTION, vectors_config=VectorParams(size=dimension, distance=Distance.COSINE))
class Passage(BaseModel):
    id: str = Field(min_length=1, max_length=120)
    text: str = Field(min_length=1, max_length=5000)
    course_id: int = Field(gt=0)
    position: int = Field(gt=0)
    checksum: str = Field(min_length=64, max_length=64)
class IndexRequest(BaseModel): passages: list[Passage] = Field(max_length=100)
class SearchRequest(BaseModel): query: str = Field(min_length=2, max_length=500); limit: int = Field(default=10, ge=1, le=30)
@app.get("/health")
def health(): return {"ok": True}
@app.post("/index")
def index(request: IndexRequest, authorization: str | None = Header(default=None)):
    auth(authorization); collection(); vectors = list(model().embed([p.text for p in request.passages]))
    store().upsert(COLLECTION, [PointStruct(id=point_id(p.id), vector=v.tolist(), payload={"course_id":p.course_id,"position":p.position,"checksum":p.checksum,"text":p.text}) for p,v in zip(request.passages,vectors)])
    return {"indexed":len(request.passages)}
@app.post("/search")
def search(request: SearchRequest, authorization: str | None = Header(default=None)):
    auth(authorization); collection(); vector = next(model().embed([request.query])).tolist()
    points = store().query_points(COLLECTION, query=vector, limit=request.limit).points
    return {"results":[{"course_id":p.payload["course_id"],"position":p.payload["position"],"text":p.payload["text"],"score":p.score} for p in points]}
@app.delete("/courses/{course_id}")
def delete_course(course_id: int, authorization: str | None = Header(default=None)):
    auth(authorization); collection(); store().delete(COLLECTION, points_selector=Filter(must=[FieldCondition(key="course_id", match=MatchValue(value=course_id))]))
    return {"deleted": course_id}
