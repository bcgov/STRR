FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Remove corepack and install pnpm directly
RUN npm uninstall -g corepack pnpm && \
    npm install -g npm@latest && \
    npm install -g pnpm@10.0.0

COPY . /app
WORKDIR /app

# Install dependencies with ignore-scripts first
RUN pnpm install --ignore-scripts

# Then run nuxt prepare separately
RUN npm exec nuxt prepare

RUN mkdir /app/config
EXPOSE 8000
CMD [ "npm", "run", "dev"]
