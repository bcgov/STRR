FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g corepack
RUN corepack enable
RUN corepack prepare pnpm@9.15.0 --activate
COPY . /app
WORKDIR /app

RUN pnpm install
RUN mkdir /app/config
EXPOSE 8000
CMD [ "npm", "run", "dev"]
