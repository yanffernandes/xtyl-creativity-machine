"""
Variable Validation Router
Provides endpoints for validating variable references and dependencies
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from services.variable_resolver import VariableResolver
from services.workflow_validator import WorkflowValidator

router = APIRouter(prefix="/validation", tags=["validation"])

class VariableValidationRequest(BaseModel):
    text: str
    available_nodes: List[Dict[str, Any]]

class VariableValidationResponse(BaseModel):
    valid: bool
    variables: List[Dict[str, Any]]
    errors: List[str]
    warnings: List[str]

class WorkflowValidationRequest(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]

class WorkflowValidationResponse(BaseModel):
    valid: bool
    errors: List[str]
    warnings: List[str]
    execution_order: Optional[List[str]] = None

@router.post("/variables", response_model=VariableValidationResponse)
async def validate_variables(request: VariableValidationRequest):
    """
    Validate variable references in text against available nodes

    Returns validation status, parsed variables, and any errors/warnings
    """
    resolver = VariableResolver()

    # Parse variables from text
    parsed_vars = resolver.parse_variables(request.text)

    # Build available nodes map
    available_nodes_map = {node['id']: node for node in request.available_nodes}

    errors = []
    warnings = []
    variables = []

    for node_id, field_name in parsed_vars:
        var_info = {
            "node_id": node_id,
            "field_name": field_name,
            "valid": True,
            "node_exists": False,
            "field_supported": False
        }

        # Check if node exists
        if node_id not in available_nodes_map:
            var_info["valid"] = False
            errors.append(f"Node '{node_id}' does not exist")
        else:
            var_info["node_exists"] = True
            node = available_nodes_map[node_id]
            node_type = node.get('type', 'unknown')

            # Get supported fields for this node type
            supported_fields = _get_node_output_fields(node_type)

            # Check if field is supported
            if field_name not in supported_fields:
                var_info["valid"] = False
                warnings.append(
                    f"Field '{field_name}' may not be available for node type '{node_type}'. "
                    f"Supported fields: {', '.join(supported_fields)}"
                )
            else:
                var_info["field_supported"] = True

        variables.append(var_info)

    return VariableValidationResponse(
        valid=len(errors) == 0,
        variables=variables,
        errors=errors,
        warnings=warnings
    )

@router.post("/workflow", response_model=WorkflowValidationResponse)
async def validate_workflow(request: WorkflowValidationRequest):
    """
    Validate complete workflow structure

    Checks for:
    - Valid node types
    - Cycles in dependency graph
    - Disconnected nodes
    - Start/finish nodes
    - Variable references
    """
    validator = WorkflowValidator()

    # Build workflow definition
    workflow_def = {
        "nodes": request.nodes,
        "edges": request.edges
    }

    # Validate structure
    result = validator.validate_workflow_structure(workflow_def)

    # If valid, calculate execution order
    execution_order = None
    if result["valid"]:
        try:
            resolver = VariableResolver()
            execution_order = resolver.build_execution_order(workflow_def)
        except Exception as e:
            result["valid"] = False
            result["errors"].append(f"Failed to build execution order: {str(e)}")

    return WorkflowValidationResponse(
        valid=result["valid"],
        errors=result["errors"],
        warnings=result["warnings"],
        execution_order=execution_order
    )

@router.get("/node-fields/{node_type}", response_model=List[str])
async def get_node_output_fields(node_type: str):
    """
    Get list of output fields for a specific node type
    """
    fields = _get_node_output_fields(node_type)

    if not fields:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown node type: {node_type}"
        )

    return fields

def _get_node_output_fields(node_type: str) -> List[str]:
    """
    Internal function to get output fields by node type
    """
    field_map = {
        'start': ['input'],
        'text_generation': ['content', 'title', 'summary', 'body', 'introduction', 'conclusion'],
        'image_generation': ['url', 'prompt', 'size', 'style'],
        'processing': ['content', 'result', 'data'],
        'context_retrieval': ['documents', 'count', 'context'],
        'conditional': ['condition_result', 'branch_taken'],
        'loop': ['iteration', 'items', 'current_item'],
        'finish': ['final_output']
    }

    return field_map.get(node_type, ['content'])

@router.post("/execution-order", response_model=List[str])
async def calculate_execution_order(request: WorkflowValidationRequest):
    """
    Calculate execution order for workflow nodes using topological sort
    """
    resolver = VariableResolver()

    workflow_def = {
        "nodes": request.nodes,
        "edges": request.edges
    }

    try:
        execution_order = resolver.build_execution_order(workflow_def)
        return execution_order
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot calculate execution order: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}"
        )
