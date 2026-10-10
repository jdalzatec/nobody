FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
RUN apk add --no-cache nodejs
RUN mkdir -p /projects /state
COPY --from=build /app/dist /usr/share/nginx/html
COPY --from=build /app/server/api.mjs /app/server/api.mjs
COPY --from=build /app/server/registry-cli.mjs /app/server/registry-cli.mjs
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh
EXPOSE 80
ENTRYPOINT ["/app/entrypoint.sh"]
