#!/bin/bash
export NDK=~/Library/Android/sdk/ndk/28.0.13004108
cmake ../../../../ \
-DCMAKE_TOOLCHAIN_FILE=$NDK/build/cmake/android.toolchain.cmake \
-DCMAKE_BUILD_TYPE=Release \
-DANDROID_ABI="arm64-v8a" \
-DGGML_OPENMP=OFF \
-DANDROID_PLATFORM=android-23 $1

make -j4
