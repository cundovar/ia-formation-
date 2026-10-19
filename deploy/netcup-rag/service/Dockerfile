FROM python:3.11-slim
WORKDIR /app
ARG EMBEDDING_MODEL=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
ENV EMBEDDING_MODEL=${EMBEDDING_MODEL}
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN python -c "from fastembed import TextEmbedding; TextEmbedding(model_name='${EMBEDDING_MODEL}', cache_dir='/models')"
COPY app.py .
EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
