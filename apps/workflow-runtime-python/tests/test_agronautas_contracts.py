from __future__ import annotations

import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
SCHEMA_PATH = ROOT / "packages" / "contracts" / "schemas" / "agronautas-contracts.v1.schema.json"
MATRIX_PATH = ROOT / "packages" / "contracts" / "fixtures" / "agronautas" / "validation-matrix.v1.json"


def _validate(schema: dict, payload):
    if "$ref" in schema:
        ref = schema["$ref"]
        key = ref.split("#/$defs/")[-1]
        return _validate(ROOT_SCHEMA["$defs"][key], payload)

    if "const" in schema and payload != schema["const"]:
        return False
    if "enum" in schema and payload not in schema["enum"]:
        return False

    schema_type = schema.get("type")
    if schema_type == "object":
        if not isinstance(payload, dict):
            return False
        required = schema.get("required", [])
        if any(key not in payload for key in required):
            return False
        properties = schema.get("properties", {})
        if schema.get("additionalProperties", True) is False and any(key not in properties for key in payload):
            return False
        return all(key not in payload or _validate(prop_schema, payload[key]) for key, prop_schema in properties.items())
    if schema_type == "array":
        if not isinstance(payload, list):
            return False
        if len(payload) < schema.get("minItems", 0):
            return False
        item_schema = schema.get("items")
        return True if item_schema is None else all(_validate(item_schema, item) for item in payload)
    if schema_type == "string":
        if not isinstance(payload, str):
            return False
        if len(payload) < schema.get("minLength", 0):
            return False
        return True
    if schema_type == "number":
        if not isinstance(payload, (int, float)) or isinstance(payload, bool):
            return False
        if payload < schema.get("minimum", payload):
            return False
        if payload > schema.get("maximum", payload):
            return False
        if "exclusiveMinimum" in schema and payload <= schema["exclusiveMinimum"]:
            return False
        return True
    if schema_type == "integer":
        if not isinstance(payload, int) or isinstance(payload, bool):
            return False
        if "minimum" in schema and payload < schema["minimum"]:
            return False
        if "maximum" in schema and payload > schema["maximum"]:
            return False
        return True
    if schema_type == "boolean":
        return isinstance(payload, bool)

    return True


ROOT_SCHEMA = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
MATRIX = json.loads(MATRIX_PATH.read_text(encoding="utf-8"))


class AgronautasContractTests(unittest.TestCase):
    def test_boundary_placeholder_is_present(self):
        boundary = ROOT_SCHEMA["$defs"]["CorrientesRiceZoneBoundaryMetadata"]
        self.assertIn("placeholder-pending-ingest", boundary["properties"]["normalizationStatus"]["enum"])

    def test_python_runtime_consumes_shared_validation_matrix(self):
        for case in MATRIX["cases"]:
            contract_schema = {"$ref": f"#/$defs/{case['contract']}"}
            self.assertEqual(_validate(contract_schema, case["payload"]), case["valid"], case["name"])


if __name__ == "__main__":
    unittest.main()
