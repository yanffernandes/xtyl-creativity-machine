#!/usr/bin/env python3
"""
Test workflow execution via API
"""
import requests
import time
import json
import sys

API_URL = "http://localhost:8000"

# Get auth token from environment or use test credentials
def get_auth_token():
    """Login and get auth token"""
    response = requests.post(
        f"{API_URL}/auth/login",
        json={
            "email": "yan@example.com",  # Replace with your test user
            "password": "password123"     # Replace with your test password
        }
    )

    if response.status_code != 200:
        print(f"❌ Login failed: {response.text}")
        sys.exit(1)

    data = response.json()
    return data.get("access_token")

def get_first_project(token):
    """Get first available project"""
    headers = {"Authorization": f"Bearer {token}"}

    # Get workspaces
    response = requests.get(f"{API_URL}/workspaces", headers=headers)
    workspaces = response.json()

    if not workspaces:
        print("❌ No workspaces found")
        sys.exit(1)

    workspace_id = workspaces[0]["id"]

    # Get projects
    response = requests.get(
        f"{API_URL}/workspaces/{workspace_id}/projects",
        headers=headers
    )
    projects = response.json()

    if not projects:
        print("❌ No projects found")
        sys.exit(1)

    return projects[0]["id"]

def get_templates(token):
    """Get available workflow templates"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{API_URL}/workflows/templates",
        headers=headers,
        params={"workspace_id": "system"}
    )

    if response.status_code != 200:
        print(f"❌ Failed to fetch templates: {response.text}")
        return []

    return response.json()

def launch_workflow(token, template_id, project_id):
    """Launch a workflow execution"""
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "template_id": template_id,
        "project_id": project_id,
        "config_json": {
            "topic": "AI-powered productivity tools",
            "tone": "professional and engaging"
        }
    }

    response = requests.post(
        f"{API_URL}/workflows/executions/",
        headers=headers,
        json=payload
    )

    if response.status_code != 200:
        print(f"❌ Failed to launch workflow: {response.text}")
        sys.exit(1)

    return response.json()

def monitor_execution(token, execution_id):
    """Monitor workflow execution with polling"""
    headers = {"Authorization": f"Bearer {token}"}

    print(f"\n🔄 Monitoring execution {execution_id}...")

    while True:
        response = requests.get(
            f"{API_URL}/workflows/executions/{execution_id}",
            headers=headers
        )

        if response.status_code != 200:
            print(f"❌ Failed to fetch execution: {response.text}")
            break

        execution = response.json()
        status = execution.get("status")
        progress = execution.get("progress_percent", 0)
        current_node = execution.get("current_node_id", "N/A")

        print(f"  Status: {status} | Progress: {progress}% | Current Node: {current_node}")

        if status in ["completed", "failed", "stopped"]:
            return execution

        time.sleep(2)

def main():
    print("🚀 Testing Workflow Execution\n")

    # Step 1: Login
    print("1️⃣ Logging in...")
    token = get_auth_token()
    print("   ✅ Logged in successfully\n")

    # Step 2: Get project
    print("2️⃣ Getting project...")
    project_id = get_first_project(token)
    print(f"   ✅ Using project: {project_id}\n")

    # Step 3: Get templates
    print("3️⃣ Fetching workflow templates...")
    templates = get_templates(token)

    if not templates:
        print("   ❌ No templates found")
        sys.exit(1)

    print(f"   ✅ Found {len(templates)} templates:")
    for t in templates:
        print(f"      - {t['name']} ({t['id']})")

    # Use first template
    template = templates[0]
    print(f"\n   Using template: {template['name']}\n")

    # Step 4: Launch workflow
    print("4️⃣ Launching workflow...")
    execution = launch_workflow(token, template["id"], project_id)
    execution_id = execution["id"]
    print(f"   ✅ Workflow launched: {execution_id}\n")

    # Step 5: Monitor execution
    print("5️⃣ Monitoring execution...")
    final_execution = monitor_execution(token, execution_id)

    # Step 6: Results
    print(f"\n{'='*60}")
    print("📊 RESULTS")
    print(f"{'='*60}")

    status = final_execution.get("status")
    progress = final_execution.get("progress_percent", 0)
    error = final_execution.get("error_message")

    if status == "completed":
        print("✅ Workflow completed successfully!")
        print(f"   Progress: {progress}%")

        # Show agent jobs
        agent_jobs = final_execution.get("agent_jobs", [])
        print(f"\n   Agent Jobs: {len(agent_jobs)}")
        for job in agent_jobs:
            print(f"      - {job['job_type']}: {job['status']}")
    else:
        print(f"❌ Workflow {status}")
        if error:
            print(f"   Error: {error}")

    print(f"\n{'='*60}\n")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
