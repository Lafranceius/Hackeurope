from contextlib import contextmanager

from agents import trace


@contextmanager
def workflow_trace(name: str):
    with trace(name):
        yield
