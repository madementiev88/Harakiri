# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY apps/miniapp/ apps/miniapp/

RUN npm ci --workspace=apps/miniapp --workspace=packages/shared --include-workspace-root

ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

WORKDIR /app/apps/miniapp
RUN npx tsc -b && npx vite build

# Production stage
FROM nginx:alpine

COPY apps/miniapp/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/miniapp/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
