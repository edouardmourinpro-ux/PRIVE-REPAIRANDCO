"""Unit test for Bug Fix 3: _unreachable_rule_satisfied bypasses legacy leads
(created_at < tracking_since) regardless of call attempt count."""
import sys
import os
sys.path.insert(0, "/app/backend")

from server import _unreachable_rule_satisfied  # noqa: E402


class TestUnreachableBypass:
    def test_legacy_lead_bypasses_rule(self):
        """Lead created before tracking_since -> rule bypassed (returns True)."""
        doc = {
            "created_at": "2025-01-01T00:00:00+00:00",
            "tracking_since": "2025-09-14T00:00:00+00:00",
            "call_attempts": [],  # 0 attempts, would fail rule otherwise
        }
        assert _unreachable_rule_satisfied(doc) is True

    def test_new_lead_no_attempts_fails(self):
        """Lead created after tracking_since with 0 attempts -> rule fails."""
        doc = {
            "created_at": "2025-10-01T00:00:00+00:00",
            "tracking_since": "2025-09-14T00:00:00+00:00",
            "call_attempts": [],
        }
        assert _unreachable_rule_satisfied(doc) is False

    def test_new_lead_3_attempts_same_day_fails(self):
        """3 attempts on 1 day -> still fails (needs 2 distinct days)."""
        doc = {
            "created_at": "2025-10-01T00:00:00+00:00",
            "tracking_since": "2025-09-14T00:00:00+00:00",
            "call_attempts": [
                {"outcome": "pas_de_reponse", "at": "2025-10-02T09:00:00+00:00"},
                {"outcome": "pas_de_reponse", "at": "2025-10-02T11:00:00+00:00"},
                {"outcome": "pas_de_reponse", "at": "2025-10-02T15:00:00+00:00"},
            ],
        }
        assert _unreachable_rule_satisfied(doc) is False

    def test_new_lead_3_attempts_2_days_no_longer_enough(self):
        doc = {
            "created_at": "2025-10-01T00:00:00+00:00",
            "tracking_since": "2025-09-14T00:00:00+00:00",
            "call_attempts": [
                {"outcome": "pas_de_reponse", "at": "2025-10-02T09:00:00+00:00"},
                {"outcome": "pas_de_reponse", "at": "2025-10-02T15:00:00+00:00"},
                {"outcome": "pas_de_reponse", "at": "2025-10-03T09:00:00+00:00"},
            ],
        }
        assert _unreachable_rule_satisfied(doc) is False  # règle du 21/09/2026 : 6 appels

    def test_missing_tracking_since_uses_standard_rule(self):
        """No tracking_since -> standard rule applies (0 attempts -> False)."""
        doc = {
            "created_at": "2025-01-01T00:00:00+00:00",
            "call_attempts": [],
        }
        assert _unreachable_rule_satisfied(doc) is False

    def test_new_lead_6_attempts_passes(self):
        doc = {
            "created_at": "2025-10-01T10:00:00+00:00",
            "tracking_since": "2025-10-01T10:00:00+00:00",
            "call_attempts": [{"outcome": "pas_de_reponse", "at": f"2025-10-0{d}T09:00:00+00:00"} for d in range(2, 8)],
        }
        assert _unreachable_rule_satisfied(doc) is True
