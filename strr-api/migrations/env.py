import os
import logging
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool, create_engine
from alembic import context

# 1. Passive Detection: Don't create an app, just look for one
try:
    from flask import current_app
    from strr_api import db
    # If we are in a Flask context (like your Flask tests or running the web app)
    if current_app:
        use_flask = True
        target_metadata = db.metadata
    else:
        raise ImportError
except (ImportError, RuntimeError):
    # 2. Standalone Fallback: For your Jobs and Job-tests
    use_flask = False
    from strr_api.models.base_model import SimpleBaseModel
    target_metadata = SimpleBaseModel.metadata

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)
logger = logging.getLogger('alembic.env')

def get_engine():
    if use_flask:
        return current_app.extensions['migrate'].db.engine
    # Standalone: use the env var you set in conftest or your job environment
    url = os.getenv("DATABASE_URL")
    return create_engine(url, poolclass=pool.NullPool)

def get_engine_url():
    if use_flask:
        return str(get_engine().url).replace('%', '%%')
    return os.getenv("DATABASE_URL").replace('%', '%%')

def get_metadata():
    return target_metadata

config.set_main_option('sqlalchemy.url', get_engine_url())

def run_migrations_online():
    connectable = get_engine()
    with connectable.connect() as connection:
        # Only pull migrate args if Flask is actually present
        extra_args = current_app.extensions['migrate'].configure_args if use_flask else {}
        
        context.configure(
            connection=connection,
            target_metadata=get_metadata(),
            **extra_args
        )
        with context.begin_transaction():
            context.run_migrations()


def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url, 
        target_metadata=get_metadata(), 
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
