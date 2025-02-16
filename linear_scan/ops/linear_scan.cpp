#include <torch/extension.h>
#include <ATen/Parallel.h>
#include <c10/util/Exception.h>
#include <cmath>  // for std::fma
using torch::indexing::Ellipsis;

at::Tensor fused_linear_scan(const at::Tensor& x0, const at::Tensor& a, const at::Tensor& u) {
  // Type and shape checks.
  TORCH_CHECK(x0.scalar_type() == at::kFloat, "x0 must be float32");
  TORCH_CHECK(a.scalar_type()  == at::kFloat, "a must be float32");
  TORCH_CHECK(u.scalar_type()  == at::kFloat, "u must be float32");
  TORCH_CHECK(x0.dim() == 2, "x0 must be [B, C]");
  TORCH_CHECK(a.dim()  == 3, "a must be [B, C, N]");
  TORCH_CHECK(u.dim()  == 3, "u must be [B, C, N]");

  const auto B = a.size(0), C = a.size(1), N = a.size(2);
  auto x0_c = x0.contiguous(), a_c = a.contiguous(), u_c = u.contiguous();
  at::Tensor x = at::empty({B, C, N}, a.options());
  const float* __restrict x0_data = x0_c.data_ptr<float>();
  const float* __restrict a_data  = a_c.data_ptr<float>();
  const float* __restrict u_data  = u_c.data_ptr<float>();
  float* __restrict x_data = x.data_ptr<float>();
  const int64_t BC = B * C;

  at::parallel_for(0, BC, /*grain_size=*/1, [&](int64_t start, int64_t end) {
    for (int64_t bc = start; bc < end; bc++) {
      const int64_t offset = bc * N;
      const float x0_val = x0_data[bc];
      // Compute the first element using FMA.
      float x_prev = std::fma(a_data[offset], x0_val, u_data[offset]);
      x_data[offset] = x_prev;
      int64_t t = 1;
      // Unroll the inner loop by a factor of 8.
      int64_t limit = ((N - 1) / 8) * 8 + 1;
      for (; t < limit; t += 8) {
        x_prev = std::fma(a_data[offset + t],     x_prev, u_data[offset + t]);
        x_data[offset + t] = x_prev;
        x_prev = std::fma(a_data[offset + t + 1], x_prev, u_data[offset + t + 1]);
        x_data[offset + t + 1] = x_prev;
        x_prev = std::fma(a_data[offset + t + 2], x_prev, u_data[offset + t + 2]);
        x_data[offset + t + 2] = x_prev;
        x_prev = std::fma(a_data[offset + t + 3], x_prev, u_data[offset + t + 3]);
        x_data[offset + t + 3] = x_prev;
        x_prev = std::fma(a_data[offset + t + 4], x_prev, u_data[offset + t + 4]);
        x_data[offset + t + 4] = x_prev;
        x_prev = std::fma(a_data[offset + t + 5], x_prev, u_data[offset + t + 5]);
        x_data[offset + t + 5] = x_prev;
        x_prev = std::fma(a_data[offset + t + 6], x_prev, u_data[offset + t + 6]);
        x_data[offset + t + 6] = x_prev;
        x_prev = std::fma(a_data[offset + t + 7], x_prev, u_data[offset + t + 7]);
        x_data[offset + t + 7] = x_prev;
      }
      // Process any remaining iterations.
      for (; t < N; t++) {
        x_prev = std::fma(a_data[offset + t], x_prev, u_data[offset + t]);
        x_data[offset + t] = x_prev;
      }
    }
  });
  return x;
}


at::Tensor fused_linear_scan2(const at::Tensor& x0, const at::Tensor& a, const at::Tensor& u) {
    // Identical implementation as fused_linear_scan.
    TORCH_CHECK(x0.scalar_type() == at::kFloat, "x0 must be float32");
    TORCH_CHECK(a.scalar_type()  == at::kFloat, "a must be float32");
    TORCH_CHECK(u.scalar_type()  == at::kFloat, "u must be float32");
    TORCH_CHECK(x0.dim() == 2, "x0 must be [B, C]");
    TORCH_CHECK(a.dim()  == 3, "a must be [B, C, N]");
    TORCH_CHECK(u.dim()  == 3, "u must be [B, C, N]");

    const auto B = a.size(0), C = a.size(1), N = a.size(2);
    auto x0_c = x0.contiguous(), a_c = a.contiguous(), u_c = u.contiguous();
    at::Tensor x = at::empty({B, C, N}, a.options());
    const float* x0_data = x0_c.data_ptr<float>();
    const float* a_data  = a_c.data_ptr<float>();
    const float* u_data  = u_c.data_ptr<float>();
    float* x_data = x.data_ptr<float>();
    const int64_t BC = B * C;

    at::parallel_for(0, BC, /*grain_size=*/1, [&](int64_t start, int64_t end) {
        for (int64_t bc = start; bc < end; bc++) {
            const int64_t offset = bc * N;
            float x_prev = a_data[offset] * x0_data[bc] + u_data[offset];
            x_data[offset] = x_prev;
            for (int64_t t = 1; t < N; t++) {
                const float a_val = a_data[offset + t];
                const float u_val = u_data[offset + t];
                x_prev = a_val * x_prev + u_val;
                x_data[offset + t] = x_prev;
            }
        }
    });
    return x;
}

// ---------------------------------------------------------------------
// Pybind11 module registration
// ---------------------------------------------------------------------
PYBIND11_MODULE(TORCH_EXTENSION_NAME, m) {
    m.def("fused_linear_scan", &fused_linear_scan, "Fused Linear Scan (float32)");
    m.def("fused_linear_scan2", &fused_linear_scan2, "Fused Linear Scan 2 (float32)");
}

// ---------------------------------------------------------------------
// Torch library registration for torch.ops.linear_scan.*
// ---------------------------------------------------------------------
TORCH_LIBRARY(linear_scan, m) {
    m.def("fused_linear_scan(Tensor x0, Tensor a, Tensor u) -> Tensor");
    m.def("fused_linear_scan2(Tensor x0, Tensor a, Tensor u) -> Tensor");
}

TORCH_LIBRARY_IMPL(linear_scan, CPU, m) {
    m.impl("fused_linear_scan", &fused_linear_scan);
    m.impl("fused_linear_scan2", &fused_linear_scan2);
}
