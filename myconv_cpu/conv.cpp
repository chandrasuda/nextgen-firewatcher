// 6:20am

#include <torch/extension.h>
#include <ATen/Parallel.h>
#include <torch/library.h>


// ---------------------------------------------------------------------
// Direct Convolution Implementation
// ---------------------------------------------------------------------
at::Tensor fused_direct_conv(const at::Tensor& input, const at::Tensor& filter) {
    TORCH_CHECK(input.scalar_type() == at::kFloat, "Input must be Float32");
    TORCH_CHECK(filter.scalar_type() == at::kFloat, "Filter must be Float32");
    TORCH_CHECK(input.dim() == 3, "Input must be [B, C, N]");
    TORCH_CHECK(filter.dim() == 2, "Filter must be [C, K]");
    TORCH_CHECK(input.size(1) == filter.size(0), "Channel mismatch");

    const int64_t B = input.size(0);
    const int64_t C = input.size(1);
    const int64_t N = input.size(2);
    const int64_t K = filter.size(1);
    
    auto x = input.contiguous();
    auto h = filter.contiguous();
    auto output = at::zeros({B, C, N}, input.options());
    
    const float* x_data = x.data_ptr<float>();
    const float* h_data = h.data_ptr<float>();
    float* out_data = output.data_ptr<float>();

    if (C >= 1024) {
        const int64_t BLOCK_SIZE = 256;
        at::parallel_for(0, B, 0, [&](int64_t b_start, int64_t b_end) {
            std::vector<float> temp_buffer(N, 0.0f);
            for (int64_t b = b_start; b < b_end; ++b) {
                for (int64_t c_block = 0; c_block < C; c_block += BLOCK_SIZE) {
                    const int64_t c_end = std::min(c_block + BLOCK_SIZE, C);
                    #pragma omp parallel for
                    for (int64_t n = 0; n < N; ++n) {
                        float sum = 0.0f;
                        for (int64_t c = c_block; c < c_end; ++c) {
                            const int64_t max_k = std::min(K, n + 1);
                            for (int64_t k = 0; k < max_k; k += 4) {
                                const int64_t k_end = std::min(k + 4, max_k);
                                float local_sum = 0.0f;
                                for (int64_t ki = k; ki < k_end; ++ki) {
                                    local_sum += x_data[b * (C * N) + c * N + (n - ki)] * 
                                               h_data[c * K + ki];
                                }
                                sum += local_sum;
                            }
                        }
                        out_data[b * (C * N) + c_block * N + n] = sum;
                    }
                }
            }
        });
        return output;
    }

    at::parallel_for(0, B * C, 0, [&](int64_t start, int64_t end) {
        for (int64_t bc = start; bc < end; ++bc) {
            const int64_t b = bc / C;
            const int64_t c = bc % C;
            
            for (int64_t n = 0; n < N; ++n) {
                float sum = 0.0f;
                const int64_t max_k = std::min(K, n + 1);
                
                for (int64_t k = 0; k < max_k; ++k) {
                    sum += x_data[b * (C * N) + c * N + (n - k)] * 
                           h_data[c * K + k];
                }
                out_data[b * (C * N) + c * N + n] = sum;
            }
        }
    });
    
    return output;
}

// ---------------------------------------------------------------------
// Winograd Convolution Implementation (F(2,3))
// ---------------------------------------------------------------------
at::Tensor fused_winograd_conv(const at::Tensor& input, const at::Tensor& filter) {
    TORCH_CHECK(input.scalar_type() == at::kFloat, "Input must be Float32");
    TORCH_CHECK(filter.scalar_type() == at::kFloat, "Filter must be Float32");
    TORCH_CHECK(input.dim() == 3, "Input must be [B, C, N]");
    TORCH_CHECK(filter.dim() == 2, "Filter must be [C, K]");
    TORCH_CHECK(filter.size(1) == 3, "Winograd F(2,3) only supports 3-point filters");
    TORCH_CHECK(input.size(1) == filter.size(0), "Channel mismatch");

    const int64_t B = input.size(0);
    const int64_t C = input.size(1);
    const int64_t N = input.size(2);
    
    auto x = input.contiguous();
    auto h = filter.contiguous();
    
    auto output = at::zeros({B, C, N}, input.options());
    
    const float* x_data = x.data_ptr<float>();
    const float* h_data = h.data_ptr<float>();
    float* out_data = output.data_ptr<float>();

    at::parallel_for(0, B * C, 0, [&](int64_t start, int64_t end) {
        for (int64_t bc = start; bc < end; ++bc) {
            const int64_t b = bc / C;
            const int64_t c = bc % C;
            
            for (int64_t n = 0; n < N - 2; n += 2) {
                const float h0 = h_data[c * 3 + 0];
                const float h1 = h_data[c * 3 + 1];
                const float h2 = h_data[c * 3 + 2];
                
                float d0 = x_data[b * (C * N) + c * N + n + 0];
                float d1 = x_data[b * (C * N) + c * N + n + 1];
                float d2 = x_data[b * (C * N) + c * N + n + 2];
                float d3 = x_data[b * (C * N) + c * N + n + 3];
                
                float w0 = d0 - d2;
                float w1 = d1 + d2;
                float w2 = -d1 + d2;
                float w3 = d1 - d3;
                
                float u0 = h0;
                float u1 = 0.5f * (h0 + h1 + h2);
                float u2 = 0.5f * (h0 - h1 + h2);
                float u3 = h2;
                
                float m0 = w0 * u0;
                float m1 = w1 * u1;
                float m2 = w2 * u2;
                float m3 = w3 * u3;
                
                float y0 = m0 + m1 + m2;
                float y1 = m1 - m2 - m3;
                
                out_data[b * (C * N) + c * N + n + 0] = y0;
                out_data[b * (C * N) + c * N + n + 1] = y1;
            }
        }
    });

    return output;
}

// ---------------------------------------------------------------------
// Meta implementations
// ---------------------------------------------------------------------
at::Tensor fused_direct_conv_meta(const at::Tensor& input, const at::Tensor& filter) {
    // For meta tensors we trust that the shapes are available.
    TORCH_CHECK(input.dim() == 3, "Input must be [B, C, N]");
    TORCH_CHECK(filter.dim() == 2, "Filter must be [C, K]");
    TORCH_CHECK(input.size(1) == filter.size(0), "Channel mismatch");
    return at::empty({input.size(0), input.size(1), input.size(2)},
                     input.options().device(c10::kMeta));
}

at::Tensor fused_winograd_conv_meta(const at::Tensor& input, const at::Tensor& filter) {
    // When working with Meta tensors the filter shape should be known.
    TORCH_CHECK(input.dim() == 3, "Input must be [B, C, N]");
    TORCH_CHECK(filter.dim() == 2, "Filter must be [C, K]");
    // If the filter isn't a meta tensor, enforce the 3-point filter constraint.
    if (!filter.is_meta())
        TORCH_CHECK(filter.size(1) == 3, "Winograd F(2,3) only supports 3-point filters");
    return at::empty({input.size(0), input.size(1), input.size(2)},
                     input.options().device(c10::kMeta));
}

// ---------------------------------------------------------------------
// FFT Convolution Implementation
// ---------------------------------------------------------------------
at::Tensor fused_fftconv(const at::Tensor& input, const at::Tensor& filter) {
    TORCH_CHECK(input.scalar_type() == at::kFloat, "Input must be Float32");
    TORCH_CHECK(filter.scalar_type() == at::kFloat, "Filter must be Float32");
    TORCH_CHECK(input.dim() == 3, "Input must be [B, C, N]");
    TORCH_CHECK(filter.dim() == 2, "Filter must be [C, K]");
    TORCH_CHECK(input.size(1) == filter.size(0), "Channel mismatch");

    // const int64_t B = input.size(0);
    // const int64_t C = input.size(1);
    const int64_t N = input.size(2);
    const int64_t K = filter.size(1);
    const int64_t L = N + K - 1;
    int64_t N_fft = 1;
    while (N_fft < L) { N_fft <<= 1; }

    auto X = input.contiguous();
    auto H = filter.contiguous();
    
    // Compute FFT of input and filter
    auto X_fft = torch::fft::rfft(X, N_fft, /*dim*/ -1);
    auto H_fft = torch::fft::rfft(H, N_fft, /*dim*/ -1);

    // Add batch dimension to filter FFT for broadcasting
    H_fft = H_fft.unsqueeze(0);
    
    // Multiply in frequency domain (element-wise)
    X_fft.mul_(H_fft);

    // Inverse FFT
    auto conv_full = torch::fft::irfft(X_fft, N_fft, /*dim*/ -1);
    
    // Slice to get original length
    return conv_full.index({torch::indexing::Ellipsis, torch::indexing::Slice(0, N)});
}

// Add the meta implementation for FFT convolution
at::Tensor fused_fftconv_meta(const at::Tensor& input, const at::Tensor& filter) {
    TORCH_CHECK(input.dim() == 3, "Input must be [B, C, N]");
    TORCH_CHECK(filter.dim() == 2, "Filter must be [C, K]");
    TORCH_CHECK(input.size(1) == filter.size(0), "Channel mismatch");
    return at::empty({input.size(0), input.size(1), input.size(2)}, 
                    input.options().device(c10::kMeta));
}

// Add the out variant
at::Tensor& fused_fftconv_out(const at::Tensor& input, 
                             const at::Tensor& filter,
                             at::Tensor& out) {
    auto result = fused_fftconv(input, filter);
    out.resize_as_(result);
    out.copy_(result);
    return out;
}

// Add these implementations after the existing convolution functions
at::Tensor& fused_direct_conv_out(const at::Tensor& input,
                                 const at::Tensor& filter,
                                 at::Tensor& out) {
    auto result = fused_direct_conv(input, filter);
    out.resize_as_(result);
    out.copy_(result);
    return out;
}

at::Tensor& fused_winograd_conv_out(const at::Tensor& input,
                                   const at::Tensor& filter,
                                   at::Tensor& out) {
    auto result = fused_winograd_conv(input, filter);
    out.resize_as_(result);
    out.copy_(result);
    return out;
}

// Pybind11 module
PYBIND11_MODULE(TORCH_EXTENSION_NAME, m) {
    m.def("fused_direct_conv", &fused_direct_conv, "Direct Convolution (Float32)");
    m.def("fused_winograd_conv", &fused_winograd_conv, "Winograd Convolution (Float32)");
    m.def("fused_fftconv", &fused_fftconv, "FFT Convolution (Float32)");
}

// Register for CPU backend
TORCH_LIBRARY(conv_ops, m) {
    m.def("fused_fftconv(Tensor input, Tensor filter) -> Tensor");
    m.def("fused_direct_conv(Tensor input, Tensor filter) -> Tensor");
    m.def("fused_winograd_conv(Tensor input, Tensor filter) -> Tensor");
    
    // Register out variants
    m.def("fused_fftconv.out(Tensor input, Tensor filter, *, Tensor(a!) out) -> Tensor(a!)");
    m.def("fused_direct_conv.out(Tensor input, Tensor filter, *, Tensor(a!) out) -> Tensor(a!)");
    m.def("fused_winograd_conv.out(Tensor input, Tensor filter, *, Tensor(a!) out) -> Tensor(a!)");
}

// Register CPU implementations
TORCH_LIBRARY_IMPL(conv_ops, CPU, m) {
    m.impl("fused_fftconv", &fused_fftconv);
    m.impl("fused_direct_conv", &fused_direct_conv);
    m.impl("fused_winograd_conv", &fused_winograd_conv);
    
    m.impl("fused_fftconv.out", &fused_fftconv_out);
    m.impl("fused_direct_conv.out", &fused_direct_conv_out);
    m.impl("fused_winograd_conv.out", &fused_winograd_conv_out);
}

// EXECUTORCH_LIBRARY(conv_ops, m) {
//     m.impl("fused_direct_conv", fused_direct_conv);
//     m.impl("fused_winograd_conv", fused_winograd_conv);
// }
