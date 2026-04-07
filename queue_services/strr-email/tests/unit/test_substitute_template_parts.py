from pathlib import Path

from flask import Flask

from strr_email.resources.email_listener import substitute_template_parts


def _email_templates_dir() -> Path:
    return Path(__file__).resolve().parents[2] / "email-templates"


def test_substitute_template_parts_inlines_footer_and_removes_markers():
    root = _email_templates_dir()
    raw = (root / "strr-PLATFORM_AUTO_APPROVED.md").read_text("utf-8")
    assert "[[strr-footer.md]]" in raw

    app = Flask(__name__)
    app.config["EMAIL_TEMPLATE_PATH"] = str(root)
    with app.app_context():
        out = substitute_template_parts(raw)

    assert "[[strr-footer.md]]" not in out
    assert "Short-Term Rental Branch" in out
