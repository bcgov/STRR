FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Update corepack before enabling it
RUN npm install -g corepack@latest
RUN corepack enable

COPY . /app
WORKDIR /app

RUN pnpm install
RUN mkdir /app/config
EXPOSE 8000
CMD [ "npm", "run", "dev"]
