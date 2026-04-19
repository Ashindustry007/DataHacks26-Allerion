import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from gemini_agents import (  # noqa: E402
    _extract_text_from_gemini_body,
    parse_gemini_json_text,
)


def test_parse_gemini_json_text_plain():
    assert parse_gemini_json_text('{"a": 1}') == {"a": 1}


def test_parse_gemini_json_text_strips_fence():
    raw = '```json\n{"x": "y"}\n```'
    assert parse_gemini_json_text(raw) == {"x": "y"}


def test_extract_text_from_gemini_body():
    body = {
        "candidates": [
            {
                "finishReason": "STOP",
                "content": {"parts": [{"text": '{"ok": true}'}]},
            }
        ]
    }
    assert _extract_text_from_gemini_body(body) == '{"ok": true}'


def test_extract_text_safety_raises():
    body = {"candidates": [{"finishReason": "SAFETY", "content": {"parts": [{"text": ""}]}}]}
    with pytest.raises(ValueError, match="SAFETY"):
        _extract_text_from_gemini_body(body)


def test_extract_empty_candidates_raises():
    with pytest.raises(ValueError, match="empty candidates"):
        _extract_text_from_gemini_body({})
