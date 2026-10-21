import sys
from pathlib import Path

# Ensure both project root and backend directory are in sys.path
root = Path(__file__).resolve().parent.parent
backend = Path(__file__).resolve().parent
if str(root) not in sys.path:
    sys.path.insert(0, str(root))
if str(backend) not in sys.path:
    sys.path.insert(0, str(backend))
