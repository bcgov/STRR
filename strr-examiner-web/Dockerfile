FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack disable
RUN npm install -g pnpm@9
# RUN corepack prepare pnpm@10.0.0 --activate

COPY . /app
WORKDIR /app

RUN pnpm install
RUN mkdir /app/config
EXPOSE 8000
CMD [ "npm", "run", "dev"]
