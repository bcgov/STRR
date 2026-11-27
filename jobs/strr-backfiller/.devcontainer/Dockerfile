FROM mcr.microsoft.com/devcontainers/python:1-3.12-bookworm

ENV PYTHONUNBUFFERED 1

# Remove the broken Yarn repository list so apt-get update doesn't fail
RUN rm -f /etc/apt/sources.list.d/yarn.list

# [Optional] If your requirements rarely change, uncomment this section to add them to the image.
# COPY requirements.txt /tmp/pip-tmp/
# RUN pip3 --disable-pip-version-check --no-cache-dir install -r /tmp/pip-tmp/requirements.txt \
#    && rm -rf /tmp/pip-tmp

# [Optional] Uncomment this section to install additional OS packages.
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends postgresql-client libpq-dev libpango1.0-0
