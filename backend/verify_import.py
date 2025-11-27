import sys
import os

# Add current directory to path
sys.path.append(os.getcwd())

try:
    from routers import models
    print("Successfully imported routers.models")
    print(f"Router prefix: {models.router.prefix}")
except Exception as e:
    print(f"Failed to import routers.models: {e}")
    import traceback
    traceback.print_exc()
