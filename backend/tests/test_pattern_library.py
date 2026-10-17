import pytest
from app.core.pattern_library import PatternLibraryEngine

def test_pattern_aws_sts():
    engine = PatternLibraryEngine()
    log = "ExpiredTokenException: The security token included in the request is expired"
    match = engine.match(log)
    assert match is not None
    assert match.pattern_id == "CRED_AWS_STS_EXPIRED"
    assert match.category == "CREDENTIALS_AUTH"
    assert match.action_type == "FIX"

def test_pattern_npm_eresolve():
    engine = PatternLibraryEngine()
    log = "npm ERR! code ERESOLVE\nnpm ERR! ERESOLVE unable to resolve dependency tree"
    match = engine.match(log)
    assert match is not None
    assert match.pattern_id == "DEP_NPM_ERESOLVE"
    assert match.category == "DEPENDENCY"
    assert match.action_type == "FIX"

def test_pattern_oom_exit_137():
    engine = PatternLibraryEngine()
    log = "/usr/bin/bash: line 1: Killed\nProcess completed with exit code 137"
    match = engine.match(log)
    assert match is not None
    assert match.pattern_id == "RES_OOM_EXIT_137"
    assert match.category == "RESOURCE_LIMIT"
    assert match.action_type == "FIX"

def test_pattern_flaky_jest_timeout():
    engine = PatternLibraryEngine()
    log = "Timeout - Async callback was not invoked within the 5000 ms timeout specified by jest.setTimeout"
    match = engine.match(log)
    assert match is not None
    assert match.pattern_id == "FLK_JEST_ASYNC_TIMEOUT"
    assert match.category == "FLAKY_CONCURRENCY"
    assert match.action_type == "RERUN"
