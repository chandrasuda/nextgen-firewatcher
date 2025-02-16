import networkx as nx
import matplotlib.pyplot as plt
from pyvis.network import Network
import json

def create_agent_graph():
    G = nx.DiGraph()
    
    # Core Nodes
    nodes = [
        ("DataAcquisition", "Data Ingestion"),
        ("SensorProcessor", "Sensor Analysis"),
        ("VisionAnalyzer", "Computer Vision"),
        ("RiskAssessor", "Risk Assessment"),
        ("NavigationPlanner", "Path Planning"),
        ("StructuralAnalyzer", "Building Analysis"),
        ("ThermalMapper", "Heat Mapping"),
        ("DecisionCoordinator", "Decision Making"),
        ("AlertManager", "Alert System"),
        ("AROverlayGenerator", "AR Generation")
    ]
    
    G.add_nodes_from(nodes)
    
    # Complex Edge Connections
    edges = [
        ("DataAcquisition", "SensorProcessor"),
        ("DataAcquisition", "VisionAnalyzer"),
        ("SensorProcessor", "RiskAssessor"),
        ("VisionAnalyzer", "StructuralAnalyzer"),
        ("VisionAnalyzer", "ThermalMapper"),
        ("StructuralAnalyzer", "RiskAssessor"),
        ("ThermalMapper", "RiskAssessor"),
        ("RiskAssessor", "DecisionCoordinator"),
        ("NavigationPlanner", "DecisionCoordinator"),
        ("DecisionCoordinator", "AlertManager"),
        ("DecisionCoordinator", "AROverlayGenerator"),
        ("RiskAssessor", "AROverlayGenerator")
    ]
    
    G.add_edges_from(edges)
    
    # Visualization
    plt.figure(figsize=(15, 10))
    pos = nx.spring_layout(G, k=1, iterations=50)
    
    nx.draw(G, pos, with_labels=True, node_color='lightblue', 
            node_size=2000, font_size=10, font_weight='bold',
            arrows=True, edge_color='gray', arrowsize=20)
    
    plt.title("FireSight Agent Network Architecture", pad=20)
    plt.savefig('lang-graph/network_visualization.png')
    plt.close()
    
    # Interactive HTML visualization
    net = Network(height='750px', width='100%', bgcolor='#ffffff', 
                 font_color='black')
    
    for node, desc in nodes:
        net.add_node(node, label=desc, title=desc)
    
    for edge in edges:
        net.add_edge(edge[0], edge[1])
    
    net.save_graph('lang-graph/interactive_network.html')

if __name__ == "__main__":
    create_agent_graph() 