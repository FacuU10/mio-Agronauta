from worker.providers.agronautas_evidence import normalize_satellite


def test_satellite_requires_scene_coverage_and_processing_proof() -> None:
    unavailable = normalize_satellite(
        {"ndvi": 0.7},
        source_url="https://stac.example.invalid/search",
        retrieved_at="2026-09-20T00:01:00Z",
        run_id="run-satellite-1",
        location_id="location-1",
        workspace_id="workspace-1",
        field_id="field-1",
    )
    proven = normalize_satellite(
        {"sceneId": "scene-1", "coverage": {"percentage": 98}, "processing": {"status": "complete", "proofRef": "processing-1"}, "ndvi": 0.7},
        source_url="https://stac.example.invalid/search",
        retrieved_at="2026-09-20T00:01:00Z",
        run_id="run-satellite-2",
        location_id="location-1",
        workspace_id="workspace-1",
        field_id="field-1",
    )

    assert unavailable.provider_mode == "unavailable"
    assert "satellite_proof_incomplete" in (unavailable.failure_reason or "")
    assert unavailable.value is None
    assert proven.provider_mode == "seam"
    assert proven.value["sceneId"] == "scene-1"
    assert proven.value["processingProof"] == "processing-1"
    assert proven.location_id == "location-1"
