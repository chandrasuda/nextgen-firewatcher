import torch
import conv_ops
import sys
from typing import Tuple, Dict
import time
import numpy as np
from memory_profiler import memory_usage
from statistics import median

def select_conv_algorithm(batch_size: int, channels: int, seq_length: int, filter_length: int) -> str:
    """Select the most appropriate convolution algorithm based on measured performance."""
    if filter_length == 3:
        if channels == 512:
            if seq_length <= 1024:  # N=64,256,1024 showed best winograd performance
                return "winograd"
            else:  # N=2048
                return "winograd"  # Actually winograd still better than FFT (18.56x vs 1.05x)
        elif channels == 2048:
            return "winograd"  # Winograd consistently better (19.09x, 17.71x, 37.45x)
    elif filter_length == 5:
        return "direct"  # Direct better for both C=512,2048 cases (3.35x, 1.80x)
    elif filter_length == 7:
        return "direct"  # Direct better (3.29x vs 1.23x)
    
    return "direct"  # Default case

def optimized_conv(x: torch.Tensor, h: torch.Tensor) -> torch.Tensor:
    """Apply the most efficient convolution algorithm for the given input tensors."""
    B, C, N = x.shape
    K = h.shape[1]
    
    algo = select_conv_algorithm(B, C, N, K)
    
    if algo == "winograd" and K == 3:
        return conv_ops.fused_winograd_conv(x, h)
    elif algo == "direct":
        return conv_ops.fused_direct_conv(x, h)
    else:
        return conv_ops.fused_fftconv(x, h)

def measure_peak_memory(func, *args, **kwargs):
    mem_usage = memory_usage((func, args, kwargs), interval=0.001, timeout=None)
    return max(mem_usage)

def benchmark_conv_with_memory(
    batch_size: int,
    channels: int,
    seq_length: int,
    filter_length: int,
    repeats: int = 20
) -> Dict[str, Dict[str, float]]:
    # Create input tensors
    x = torch.randn(batch_size, channels, seq_length, dtype=torch.float32)
    h = torch.randn(channels, filter_length, dtype=torch.float32)
    
    methods = {
        "baseline_fft": lambda x, h: conv_ops.fused_fftconv(x, h),
        "optimized": optimized_conv
    }
    
    stats = {name: {"times": [], "peak_memory": 0.0} for name in methods}
    
    # Warmup
    for func in methods.values():
        _ = func(x, h)
    
    # Benchmark each method
    for name, func in methods.items():
        # Time measurements
        run_times = []
        for _ in range(repeats):
            start = time.perf_counter()
            _ = func(x, h)
            run_times.append((time.perf_counter() - start) * 1000)  # Convert to ms
        stats[name]["times"] = run_times
        
        # Memory measurement
        peak_mem = measure_peak_memory(func, x, h)
        stats[name]["peak_memory"] = peak_mem
    
    # Calculate median times
    for name in methods:
        stats[name]["median_time"] = median(stats[name]["times"])
    
    return stats

if __name__ == "__main__":
    # Test configurations
    configs = [
        # B, C, N, K
        (1, 512, 64, 3),
        (1, 512, 256, 3),
        (1, 512, 1024, 3),
        (1, 512, 2048, 3),
        (1, 2048, 64, 3),
        (1, 2048, 256, 3),
        (1, 2048, 1024, 3),
        # Additional test cases for non-Winograd filters
        (1, 512, 256, 5),
        (1, 2048, 256, 5),
        (1, 512, 1024, 7),
    ]
    
    print("Testing convolution implementations...")
    print("Format: B=batch_size, C=channels, N=sequence_length, K=filter_length")
    print("-" * 80)
    
    for B, C, N, K in configs:
        try:
            stats = benchmark_conv_with_memory(B, C, N, K)
            algo_used = select_conv_algorithm(B, C, N, K)
            
            print(f"\nConfig: B={B}, C={C}, N={N}, K={K}")
            print(f"Selected Algorithm: {algo_used}")
            
            # Print timing results
            baseline_time = stats["baseline_fft"]["median_time"]
            baseline_mem = stats["baseline_fft"]["peak_memory"]
            opt_time = stats["optimized"]["median_time"]
            opt_mem = stats["optimized"]["peak_memory"]
            
            print(f"Baseline FFT:")
            print(f"  Time: {baseline_time:.2f} ms")
            print(f"  Memory: {baseline_mem:.2f} MB")
            
            print(f"Optimized:")
            print(f"  Time: {opt_time:.2f} ms")
            print(f"  Memory: {opt_mem:.2f} MB")
            print(f"  Speedup vs FFT: {baseline_time/opt_time:.2f}x")
            
        except Exception as e:
            print(f"Error testing B={B}, C={C}, N={N}, K={K}: {str(e)}") 