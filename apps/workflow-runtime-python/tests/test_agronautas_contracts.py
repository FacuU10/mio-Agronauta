from __future__ import annotations

import json
import unittest
from pathlib import Path

from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[3]
SCHEMA_PATH = ROOT / "packages" / "contracts" / "schemas" / "agronautas-contracts.v1.schema.json"
MATRIX_PATH = ROOT / "packages" / "contracts" / "fixtures" / "agronautas" / "validation-matrix.v1.json"
RISK_ENGINE_SCHEMA_PATH = ROOT / "packages" / "contracts" / "schemas" / "risk-engine-contract.v1.schema.json"
RISK_ENGINE_VECTORS_PATH = ROOT / "packages" / "contracts" / "risk-engine" / "golden-vectors.json"
RUNTIME_SCHEMA_PATH = ROOT / "packages" / "contracts" / "schemas" / "agronautas-runtime.v2.schema.json"
RUNTIME_FIXTURE_PATH = ROOT / "packages" / "contracts" / "fixtures" / "agronautas" / "runtime-contract.v2.json"


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
        if "maxLength" in schema and len(payload) > schema["maxLength"]:
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
    def test_python_validates_the_shared_v2_runtime_fixture(self):
        schema = json.loads(RUNTIME_SCHEMA_PATH.read_text(encoding="utf-8"))
        fixture = json.loads(RUNTIME_FIXTURE_PATH.read_text(encoding="utf-8"))
        for case in fixture["cases"]:
            validator = Draft202012Validator({"$defs": schema["$defs"], "$ref": f"#/$defs/{case['contract']}"})
            errors = list(validator.iter_errors(case["payload"]))
            self.assertEqual(not errors, case["valid"], case["name"])

        self.assertEqual(fixture["cases"][0]["payload"]["contractVersion"], "2.0.0")
        self.assertEqual(fixture["cases"][0]["payload"]["result"]["engine"]["selectionStatus"], "undecided")

        legal_transitions = {
            ("queued", "leased"),
            ("leased", "running"),
            ("running", "succeeded"),
            ("running", "failed"),
            ("running", "waiting"),
            ("running", "dlq"),
            ("running", "cancelled"),
            ("waiting", "leased"),
        }
        for transition in fixture["transitions"]:
            self.assertEqual((transition["from"], transition["to"]) in legal_transitions, transition["legal"], transition["name"])

        for duplicate in fixture["duplicates"]:
            self.assertEqual(duplicate["existing"] == duplicate["incoming"], duplicate["idempotent"], duplicate["name"])

        for lease in fixture["leaseReclaims"]:
            reclaimable = lease["state"] == "leased" and lease["leaseExpiresAt"] <= lease["now"]
            self.assertEqual(reclaimable, lease["reclaimable"], lease["name"])

        for lineage in fixture["lineageCases"]:
            both_dates_are_observations = lineage["observedAt"] is not None and lineage["forecastAt"] is not None
            self.assertEqual(not both_dates_are_observations, lineage["valid"], lineage["name"])

        for reason in fixture["reasonCases"]:
            is_typed = reason["value"] in schema["$defs"]["DegradationReason"]["enum"]
            self.assertEqual(is_typed, reason["valid"], reason["name"])

        for outcome in fixture["availabilityCases"]:
            payload = outcome["payload"]
            if payload.get("status") == "unavailable":
                reasons = payload.get("degradationReasons")
                truthful = "risk" not in payload and isinstance(reasons, list) and 0 < len(reasons) <= 8 and all(
                    reason in schema["$defs"]["DegradationReason"]["enum"] for reason in reasons
                )
            else:
                truthful = payload.get("status") in {"available", "degraded"} and "risk" in payload and "engine" in payload
            self.assertEqual(truthful, outcome["valid"], outcome["name"])

    def test_boundary_placeholder_is_present(self):
        boundary = ROOT_SCHEMA["$defs"]["CorrientesRiceZoneBoundaryMetadata"]
        self.assertIn("placeholder-pending-ingest", boundary["properties"]["normalizationStatus"]["enum"])

    def test_python_runtime_consumes_shared_validation_matrix(self):
        for case in MATRIX["cases"]:
            contract_schema = {"$ref": f"#/$defs/{case['contract']}"}
            self.assertEqual(_validate(contract_schema, case["payload"]), case["valid"], case["name"])

    def test_risk_engine_vectors_keep_canonical_engine_undecided_and_record_divergence(self):
        schema = json.loads(RISK_ENGINE_SCHEMA_PATH.read_text(encoding="utf-8"))
        vectors = json.loads(RISK_ENGINE_VECTORS_PATH.read_text(encoding="utf-8"))

        Draft202012Validator(schema).validate(vectors)
        self.assertEqual(schema["$defs"]["CanonicalEngineGate"]["properties"]["status"]["const"], "undecided")
        self.assertIsNone(schema["$defs"]["CanonicalEngineGate"]["properties"]["engineId"]["const"])
        self.assertEqual(vectors["canonicalEngine"], {"status": "undecided", "engineId": None})
        self.assertGreaterEqual(len(vectors["vectors"]), 2)

        for vector in vectors["vectors"]:
            self.assertEqual(set(vector["expectedByEngine"]), {"risk-v0", "open-meteo-basic-v1"})
            self.assertEqual(vector["comparison"]["status"], "divergent")
            self.assertFalse(vector["comparison"]["parityClaim"])
            self.assertTrue(vector["comparison"]["differences"], vector["id"])


if __name__ == "__main__":
    unittest.main()
