FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Install PNPM explicitly instead of using Corepack
RUN npm install -g pnpm@9.15.0

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

# Install dependencies using PNPM
RUN pnpm install --frozen-lockfile

COPY . /app

RUN mkdir /app/config
EXPOSE 8000
CMD [ "npm", "run", "dev"]
