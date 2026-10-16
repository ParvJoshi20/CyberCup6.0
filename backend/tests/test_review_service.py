import pytest

from app.reviews.service import ReviewService, ReviewStatus


@pytest.fixture
def service():
    return ReviewService()


def create_case(service):
    return service.create_case(
        request_id="request-123",
        category="prompt_injection",
        summary="Potential prompt injection requires review.",
    )


def test_create_case_starts_pending(service):
    case = create_case(service)

    assert case.status == ReviewStatus.PENDING
    assert case.review_id
    assert case.created_at
    assert case.decided_by is None


def test_list_pending_returns_only_pending_cases(service):
    first = create_case(service)
    second = create_case(service)

    service.decide(
        review_id=first.review_id,
        decision=ReviewStatus.APPROVED,
        reviewer_id="reviewer-1",
    )

    assert [case.review_id for case in service.list_pending()] == [
        second.review_id
    ]


@pytest.mark.parametrize(
    "decision",
    [ReviewStatus.APPROVED, ReviewStatus.REJECTED],
)
def test_decision_records_reviewer_and_time(service, decision):
    case = create_case(service)

    updated = service.decide(
        review_id=case.review_id,
        decision=decision,
        reviewer_id="reviewer-1",
        note="Reviewed.",
    )

    assert updated.status == decision
    assert updated.decided_by == "reviewer-1"
    assert updated.decided_at is not None
    assert updated.decision_note == "Reviewed."


def test_second_decision_is_rejected(service):
    case = create_case(service)

    service.decide(
        review_id=case.review_id,
        decision=ReviewStatus.APPROVED,
        reviewer_id="reviewer-1",
    )

    with pytest.raises(ValueError, match="already been decided"):
        service.decide(
            review_id=case.review_id,
            decision=ReviewStatus.REJECTED,
            reviewer_id="reviewer-2",
        )


def test_unknown_case_is_rejected(service):
    with pytest.raises(KeyError, match="not found"):
        service.get_case("missing-review")


def test_invalid_decision_is_rejected(service):
    case = create_case(service)

    with pytest.raises(ValueError, match="approved or rejected"):
        service.decide(
            review_id=case.review_id,
            decision=ReviewStatus.PENDING,
            reviewer_id="reviewer-1",
        )


def test_empty_reviewer_is_rejected(service):
    case = create_case(service)

    with pytest.raises(ValueError, match="reviewer_id"):
        service.decide(
            review_id=case.review_id,
            decision=ReviewStatus.APPROVED,
            reviewer_id=" ",
        )


def test_oversized_note_is_rejected(service):
    case = create_case(service)

    with pytest.raises(ValueError, match="1000 characters"):
        service.decide(
            review_id=case.review_id,
            decision=ReviewStatus.REJECTED,
            reviewer_id="reviewer-1",
            note="x" * 1001,
        )
