# Build stage
FROM node:26-alpine@sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5 AS build

# Install git to read version info
RUN apk add --no-cache git

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
COPY backend/src/main/resources/data/ /app/backend/src/main/resources/data/

# Inject git version info as build-time env vars
ARG VITE_GIT_TAG
ARG VITE_GIT_COMMIT
ARG VITE_BUILD_TIME
ENV VITE_GIT_TAG=${VITE_GIT_TAG}
ENV VITE_GIT_COMMIT=${VITE_GIT_COMMIT}
ENV VITE_BUILD_TIME=${VITE_BUILD_TIME}

RUN npm run build

# Production stage
FROM nginx:alpine@sha256:fed7e14be83cbd2661a75cdc5b872d936cf155d46c327084d30b8df19ae88d72
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
