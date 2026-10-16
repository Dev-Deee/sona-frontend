FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Vite inlines VITE_* variables at build time. Empty = same origin (nginx proxies /api).
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# The official image runs envsubst on /etc/nginx/templates/*.template at start-up.
COPY nginx.conf /etc/nginx/templates/default.conf.template
ENV API_UPSTREAM=http://host.docker.internal:8080
EXPOSE 80
