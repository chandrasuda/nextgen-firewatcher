from typing import TypedDict, Annotated, Sequence
from langchain_core.messages import BaseMessage, HumanMessage
from langchain.chat_models import ChatOpenAI
from langchain_core.output_parsers import JsonOutputParser
from langchain.prompts import ChatPromptTemplate
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolExecutor
import json
import os

# State definition
class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], "Chat messages"]
    next_agent: Annotated[str | None, "Next agent to call"]
    sensor_data: dict
    vision_analysis: dict
    risk_assessment: dict
    navigation_plan: dict
    final_decision: dict | None

# Initialize OpenAI
llm = ChatOpenAI(model="gpt-4-vision-preview")

# Agent Nodes
def create_data_acquisition_node():
    prompt = ChatPromptTemplate.from_messages([
        ("system", "Process incoming sensor and vision data from firefighter equipment."),
        ("human", "{input}")
    ])
    
    def data_acquisition(state: AgentState):
        messages = state["messages"]
        response = llm.invoke(prompt.format_messages(input=messages[-1].content))
        return {
            **state,
            "sensor_data": json.loads(response.content),
            "next_agent": "vision_analyzer"
        }
    
    return data_acquisition

def create_vision_analyzer_node():
    prompt = ChatPromptTemplate.from_messages([
        ("system", "Analyze visual data for hazards and structural integrity."),
        ("human", "{input}")
    ])
    
    def vision_analyzer(state: AgentState):
        response = llm.invoke(prompt.format_messages(
            input=json.dumps(state["sensor_data"])
        ))
        return {
            **state,
            "vision_analysis": json.loads(response.content),
            "next_agent": "risk_assessor"
        }
    
    return vision_analyzer

# Additional agent nodes...

def create_graph():
    # Initialize graph
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("data_acquisition", create_data_acquisition_node())
    workflow.add_node("vision_analyzer", create_vision_analyzer_node())
    # Add more nodes...
    
    # Add edges
    workflow.add_edge("data_acquisition", "vision_analyzer")
    workflow.add_edge("vision_analyzer", "risk_assessor")
    # Add more edges...
    
    # Set entry point
    workflow.set_entry_point("data_acquisition")
    
    # Compile
    app = workflow.compile()
    
    return app

if __name__ == "__main__":
    graph = create_graph() 