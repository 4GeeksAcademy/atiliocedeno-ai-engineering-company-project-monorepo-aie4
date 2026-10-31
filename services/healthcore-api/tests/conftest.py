"""Keep test accounts and secrets out of the developer's database."""
import os
import sys
import tempfile
from pathlib import Path

_TEST_DIR = tempfile.TemporaryDirectory(prefix="healthcore-tests-")
os.environ["HEALTHCORE_DB_PATH"] = str(Path(_TEST_DIR.name) / "test.json")
os.environ["HEALTHCORE_JWT_SECRET"] = "isolated-test-secret-not-for-use-outside-tests"
os.environ["PYTHON_DOTENV_DISABLED"] = "1"
for key in ("RESEND_API_KEY", "RESEND_FROM_EMAIL", "HEALTHCORE_BOOTSTRAP_ADMIN_EMAIL", "HEALTHCORE_BOOTSTRAP_ADMIN_PASSWORD"):
    os.environ.pop(key, None)
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
