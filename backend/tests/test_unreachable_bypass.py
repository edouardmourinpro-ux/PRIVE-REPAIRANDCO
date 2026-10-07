"""Unit test for _unreachable_rule_satisfied: 6 "pas_de_reponse" calls required
(S20 complement — simplified from the old 3-calls/2-days rule), and legacy
leads (created_at < tracking_since) bypass the rule regardless of count."""
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

    def test_new_lead_5_attempts_fails(self):
        """5 attempts -> still fails (needs 6)."""
        doc = {
            "created_at": "2025-10-01T00:00:00+00:00",
            "tracking_since": "2025-09-14T00:00:00+00:00",
            "call_attempts": [
                {"outcome": "pas_de_reponse", "at": f"2025-10-0{d}T09:00:00+00:00"} for d in range(2, 7)
            ],
        }
        assert _unreachable_rule_satisfied(doc) is False

    def test_new_lead_6_attempts_passes(self):
        doc = {
            "created_at": "2025-10-01T00:00:00+00:00",
            "tracking_since": "2025-09-14T00:00:00+00:00",
            "call_attempts": [
                {"outcome": "pas_de_reponse", "at": f"2025-10-0{d}T09:00:00+00:00"} for d in range(2, 8)
            ],
        }
        assert _unreachable_rule_satisfied(doc) is True

    def test_missing_tracking_since_no_calls_bypasses_rule(self):
        """No tracking_since AND zero call_attempts -> truly untouched old lead,
        rule bypassed (S29: same gating as the to-call entry rule)."""
        doc = {
            "created_at": "2025-01-01T00:00:00+00:00",
            "call_attempts": [],
        }
        assert _unreachable_rule_satisfied(doc) is True

    def test_missing_tracking_since_but_touched_uses_standard_rule(self):
        """No tracking_since but at least 1 call_attempts -> lead has been
        touched, standard 6-call rule applies (S29)."""
        doc = {
            "created_at": "2025-01-01T00:00:00+00:00",
            "call_attempts": [{"outcome": "pas_de_reponse", "at": "2025-10-02T09:00:00+00:00"}],
        }
        assert _unreachable_rule_satisfied(doc) is False
