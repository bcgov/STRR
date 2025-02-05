FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV COREPACK_ENABLE_STRICT=0

# Install pnpm directly and disable corepack
RUN npm uninstall -g corepack && \
    npm install -g pnpm@10.0.0

COPY . /app
WORKDIR /app

# Install dependencies without running any scripts
RUN COREPACK_ENABLE_STRICT=0 pnpm install --ignore-scripts

# Run prepare manually without using pnpm
RUN node .output/server/index.mjs prepare

RUN mkdir /app/config
EXPOSE 8000
CMD [ "npm", "run", "dev"]
