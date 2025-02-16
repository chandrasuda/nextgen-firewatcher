from dataclasses import dataclass
from typing import List, Dict, Any

@dataclass
class AgentConfig:
    name: str
    description: str
    tools: List[str]
    required_inputs: List[str]
    outputs: List[str]
    model_config: Dict[str, Any]

AGENT_CONFIGS = {
    "data_acquisition": AgentConfig(
        name="DataAcquisitionAgent",
        description="Processes raw sensor and vision data streams",
        tools=["sensor_reader", "vision_stream_processor"],
        required_inputs=["raw_sensor_data", "raw_vision_data"],
        outputs=["processed_sensor_data", "processed_vision_data"],
        model_config={
            "model": "gpt-4-vision-preview",
            "temperature": 0.2,
            "max_tokens": 500
        }
    ),
    "risk_assessor": AgentConfig(
        name="RiskAssessmentAgent",
        description="Analyzes processed data for hazard identification",
        tools=["hazard_detector", "risk_calculator"],
        required_inputs=["processed_sensor_data", "processed_vision_data"],
        outputs=["risk_assessment", "hazard_locations"],
        model_config={
            "model": "gpt-4",
            "temperature": 0.1,
            "max_tokens": 1000
        }
    ),
    # Add more agent configs...
} 