from pathlib import Path
from typing import Tuple, Union
import fused_linear_scan
import os
import torch
import torch.nn as nn
from torch.export import export, ExportedProgram
from executorch.exir import EdgeProgramManager, to_edge
from executorch.exir.backend.backend_api import LoweredBackendModule
from executorch.backends.xnnpack.utils.configs import get_xnnpack_edge_compile_config
from executorch.backends.xnnpack.partition.xnnpack_partitioner import XnnpackPartitioner
from executorch.devtools import Inspector
from profiler import Profiler, ProfilingResults, extract_stats

class LinearScanModule(nn.Module):
    def __init__(self):
        super().__init__()
    
    def forward(self, x0, a, u):
        return torch.ops.linear_scan.fused_linear_scan(x0, a, u)

# Example inputs
B, C, N = 1, 2048, 1024
example_args = (
    torch.randn(B, C, dtype=torch.float32),
    torch.randn(B, C, N, dtype=torch.float32),
    torch.randn(B, C, N, dtype=torch.float32)
)

# Export and lower the module
module = LinearScanModule()
aten_dialect_program: ExportedProgram = export(module, example_args)

edge_config = get_xnnpack_edge_compile_config()
edge_program: EdgeProgramManager = to_edge(aten_dialect_program, compile_config=edge_config)

# Lower the module
edge_manager_to_backend: LoweredBackendModule = edge_program.to_backend(XnnpackPartitioner())
et_program = edge_manager_to_backend.to_executorch()

# Serialize and save
save_path = "linear_scan_delegate.pte"
with open(save_path, "wb") as f:
    f.write(et_program.buffer)

# Profile using the local profiler
pte_runner_path = os.environ.get("PTE_RUNNER_PATH", 'runner/macos-arm64/pte_runner')
profiler = LocalPyProfiler(pte_runner_path)
profiling_result = profiler.profile(save_path, example_args, repeats=20)
print(profiling_result)