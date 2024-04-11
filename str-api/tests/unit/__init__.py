from contextlib import contextmanager


@contextmanager
def nested_session(session):
    try:
        sess = session.begin_nested()
        yield sess
    except Exception as error:
        print(error)
        raise error
    finally:
        pass
