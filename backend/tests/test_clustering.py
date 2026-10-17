import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.database import Base
from app.models.schema import FailureCluster
from app.core.clustering import get_or_create_cluster

@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

def test_clustering_occurrence_counter(db_session):
    fp = "cred_aws_sts:cred_aws_sts_expired:generic"
    
    # First occurrence
    cluster1, count1 = get_or_create_cluster(
        db=db_session,
        fingerprint=fp,
        title="AWS STS Expired",
        category="CREDENTIALS_AUTH",
        suggested_action_type="FIX",
        suggested_direction="Rotate credentials",
        repo_name="acme/api"
    )
    assert count1 == 1
    assert cluster1.occurrence_count == 1
    assert "acme/api" in cluster1.affected_repos

    # Second occurrence (same fingerprint, different repo)
    cluster2, count2 = get_or_create_cluster(
        db=db_session,
        fingerprint=fp,
        title="AWS STS Expired",
        category="CREDENTIALS_AUTH",
        suggested_action_type="FIX",
        suggested_direction="Rotate credentials",
        repo_name="acme/billing-worker"
    )
    assert count2 == 2
    assert cluster2.id == cluster1.id
    assert cluster2.occurrence_count == 2
    assert "acme/api" in cluster2.affected_repos
    assert "acme/billing-worker" in cluster2.affected_repos
