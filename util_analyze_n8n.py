
import json
import sys

# Path to the n8n JSON file in the artifacts directory
file_path = '/Users/adrianortiz/.gemini/antigravity/brain/d27d021a-1ca1-4202-81c6-7f0e96fe9fa6/.system_generated/steps/7/output.txt'

try:
    with open(file_path, 'r') as f:
        content = f.read()
        if content.startswith('1: '):
             content = content[3:]
        
        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            print("Failed to parse JSON. Content snippet:")
            print(content[:100])
            sys.exit(1)

    print("Successfully loaded JSON")

    workflow = data.get('workflow', {})
    nodes = workflow.get('nodes', [])
    
    finance_node_name = "AI Agent - Finance"
    finance_node = None

    print(f"Searching for node: {finance_node_name}")
    
    for node in nodes:
        if node.get('name') == finance_node_name:
            finance_node = node
            print(f"Found node: {node['name']} (ID: {node['id']})")
            print(json.dumps(node, indent=2))
            break
            
    if not finance_node:
        print(f"Node '{finance_node_name}' not found.")
        print("Similar nodes found:")
        for node in nodes:
            if "Finance" in node.get('name', ''):
                print(f" - {node['name']}")
    
    connections = workflow.get('connections', {})
    print("\nConnected Tools:")
    # Check "tools" input of Finance Agent
    # n8n agent inputs usually come via "tools" connection
    # Or embedded. Let's look for nodes that output to "tools" or "tool" input of Finance Agent
    
    for src_node_name, outputs in connections.items():
        for output_name, channels in outputs.items():
            for channel in channels:
                for link in channel:
                    if link['node'] == finance_node_name:
                        # Check input name if available or just list all inputs
                        # n8n JSON usually has link object struct: {"node": "Target", "type": "main", "index": 0}
                        # but some have "input" name.
                        print(f"  - Input from {src_node_name} (Output: {output_name})")
                        # If src_node has type "n8n-nodes-base.tool" or similar
                        for n in nodes:
                            if n['name'] == src_node_name:
                                print(f"    Type: {n['type']}")
                                if 'tool' in n['type'].lower():
                                    print(f"    Tool Config: {json.dumps(n.get('parameters', {}), indent=2)}")

    
    # Generic String Search
    search_terms = ["Nova", "company_prompts", "system_message"]
    print("\nSearch Results in JSON values:")
    
    def search_json(obj, path=""):
        if isinstance(obj, dict):
            for k, v in obj.items():
                search_json(v, f"{path}.{k}")
        elif isinstance(obj, list):
            for i, v in enumerate(obj):
                search_json(v, f"{path}[{i}]")
        elif isinstance(obj, str):
            for term in search_terms:
                if term in obj:
                    sample = obj[:100].replace('\n', ' ')
                    # Print only if it's not the huge content itself
                    if len(obj) < 500: 
                        print(f"  - Found '{term}' at {path}: {sample}")
                    else:
                        print(f"  - Found '{term}' in large string at {path} (Length: {len(obj)})")

    search_json(workflow)

except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
