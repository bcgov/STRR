#build stage
FROM node:21-alpine AS build
ARG DOT_ENV_FILE
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

COPY . /web
WORKDIR /web
COPY ${DOT_ENV_FILE} /web/.env

RUN pnpm install
RUN pnpm build

#runtime stage
FROM nginx:1.25

COPY --from=build /web/.output/public /usr/share/nginx/html/