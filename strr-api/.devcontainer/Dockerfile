FROM mcr.microsoft.com/devcontainers/python:3.12-bookworm

# 1. FIX: Remove the broken Yarn repository list so apt-get update doesn't fail
RUN rm -f /etc/apt/sources.list.d/yarn.list

# 2. SYSTEM DEPENDENCIES: Install Pango, Postgres, and Node.js prerequisites
# Added 'curl' and 'gnupg' to ensure we can fetch the NodeSource setup script.
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    postgresql-client \
    curl \
    gnupg \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# 3. NODE.JS & NPM: Install Node.js v20 (LTS) via NodeSource
# This installs both 'node' and 'npm'.
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# 4. GEMINI CLI: Install the official Google Gemini CLI globally
RUN npm install -g @google/gemini-cli

# 5. POETRY: Install via pip to avoid ARM64/SSL errors
RUN pip install --no-cache-dir poetry

# 6. CONFIG: Set Poetry defaults
RUN poetry config virtualenvs.in-project true