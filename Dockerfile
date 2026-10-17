# Stage 1: Compile React. Built frontend contains no API credentials.
FROM node:22-alpine AS frontend
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY index.html vite.config.js ./
COPY src ./src
COPY public ./public
RUN npm run build

# Stage 2: Serve the API and built React app from one origin.
FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY server/requirements.txt ./server/requirements.txt
RUN pip install --no-cache-dir -r server/requirements.txt
COPY server ./server
COPY --from=frontend /app/dist ./dist
RUN useradd --create-home --uid 10001 appuser
USER appuser
EXPOSE 8001
CMD ["python", "-m", "uvicorn", "server.main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "1"]
