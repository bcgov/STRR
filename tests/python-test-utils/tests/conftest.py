import sys
from pathlib import Path

# 1. Add 'src' to sys.path so we can import 'strr_test_utils'
# This simulates the library being "installed" via Poetry
src_path = str(Path(__file__).parent.parent / "src")
if src_path not in sys.path:
    sys.path.insert(0, src_path)

# 2. Tell Pytest to use the local fixtures for these internal tests
pytest_plugins = [
    "strr_test_utils.utils_fixtures",
    "strr_test_utils.db_fixtures",
    "strr_test_utils.redis_fixtures",
]
