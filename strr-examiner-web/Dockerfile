FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Install pnpm directly
RUN npm install -g pnpm@10.0.0

COPY . /app
WORKDIR /app

RUN pnpm install
RUN mkdir /app/config
EXPOSE 8000
CMD [ "npm", "run", "dev"]
