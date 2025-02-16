#!/bin/bash

# Model configurations
model_dir="/Users/ryanrong/Documents/GitHub/MobileVLM-1.7B"
projector_name="mmproj-model-f16.gguf"
llama_name="ggml-model-q4_k.gguf"
img_dir="/Users/ryanrong/Documents/GitHub/MobileVLM-1.7B"
img_name="demo.jpg"
prompt="A chat between a fire fighter and an agentic artificial intelligence assistant. The assistant gives helpful and succinct answers to the user's questions and aid in firefighting. USER: <image>\nHow can I approach this fire? \nAnswer the question using a short sentence. ASSISTANT:"
# img_name="cat.jpeg"
# prompt="A chat between a curious user and an artificial intelligence assistant. The assistant gives helpful, detailed, and polite answers to the user's questions. USER: <image>\nWhat is in the image? ASSISTANT:"

program_dir="examples/llava/android/build_64/bin"
binName="llama-llava-cli"
n_threads=4


deviceDir="/data/local/tmp"
saveDir="output"
if [ ! -d ${saveDir} ]; then
    mkdir ${saveDir}
fi

function check_adb() {
    if ! command -v adb &> /dev/null; then
        echo "Error: adb command not found. Please install Android SDK platform tools."
        exit 1
    fi
}

function check_device() {
    if [ -z "$(adb devices | grep -v 'List' | grep 'device')" ]; then
        echo "Error: No Android device connected or authorized."
        exit 1
    fi
}

function android_run() {
    # Verify requirements
    check_adb
    check_device

    echo "Copying resources to device..."
    
    # Copy model files to device
    adb push "${model_dir}/${projector_name}" "${deviceDir}/${projector_name}" || exit 1
    adb push "${model_dir}/${llama_name}" "${deviceDir}/${llama_name}" || exit 1
    
    # Copy image file
    adb push "${img_dir}/${img_name}" "${deviceDir}/${img_name}" || exit 1
    
    # Copy and set permissions for program
    echo "Copying program and setting permissions..."
    adb push "${program_dir}/${binName}" "${deviceDir}/${binName}" || exit 1
    adb shell "chmod 0777 ${deviceDir}/${binName}" || exit 1

    # Create lib directory on device
    adb shell "mkdir -p ${deviceDir}/lib"

    # Copy shared library
    adb push "${program_dir}/libllama.so" "${deviceDir}/lib/" || exit 1
    adb push "${program_dir}/libggml.so" "${deviceDir}/lib/" || exit 1
    adb push "${program_dir}/libggml-cpu.so" "${deviceDir}/lib/" || exit 1
    adb push "${program_dir}/libggml-base.so" "${deviceDir}/lib/" || exit 1
    adb push "${program_dir}/libllava_shared.so" "${deviceDir}/lib/" || exit 1

    # Output filename
    output_file="${deviceDir}/${modelName}_${projector_name}_${n_threads}_${img_name}.txt"

    # Run the program
    echo "Running inference..."
    adb shell "cd ${deviceDir} && LD_LIBRARY_PATH=${deviceDir}/lib ${deviceDir}/${binName} \
        -m ${deviceDir}/${llama_name} \
        --mmproj ${deviceDir}/${projector_name} \
        -t ${n_threads} \
        --image ${deviceDir}/${img_name} \
        -p \"${prompt}\" \
        > ${output_file} 2>&1"

    # Pull results
    echo "Retrieving results..."
    adb pull "${output_file}" "${saveDir}" || {
        echo "Error: Failed to retrieve results"
        exit 1
    }
}

# Main execution
android_run
echo "android_run completed successfully!"
