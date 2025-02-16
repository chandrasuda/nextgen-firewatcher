#!/bin/bash

# Model configurations
model_dir="/Users/ryanrong/Documents/GitHub/MobileVLM-1.7B"
projector_name="mmproj-model-f16.gguf"
llama_name="ggml-model-q4_k.gguf"
prompt="A chat between a fire fighter and an agentic artificial intelligence assistant. The assistant gives helpful and succinct answers to the user's questions and aid in firefighting. USER: <image>\nHow can I approach this fire? \nAnswer the question using a short sentence. ASSISTANT:"

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
    if [ -z "$(adb devices | grep -v List | grep device)" ]; then
        echo "Error: No Android device found. Please connect a device and enable USB debugging."
        exit 1
    fi
}

function setup_device() {
    # Copy model files and libraries (only needs to be done once)
    adb push "${model_dir}/${projector_name}" "${deviceDir}/${projector_name}" || exit 1
    adb push "${model_dir}/${llama_name}" "${deviceDir}/${llama_name}" || exit 1
    
    adb push "${program_dir}/${binName}" "${deviceDir}/${binName}" || exit 1
    adb shell "chmod 0777 ${deviceDir}/${binName}" || exit 1

    adb shell "mkdir -p ${deviceDir}/lib"
    adb push "${program_dir}/libllama.so" "${deviceDir}/lib/" || exit 1
    adb push "${program_dir}/libggml.so" "${deviceDir}/lib/" || exit 1
    adb push "${program_dir}/libggml-cpu.so" "${deviceDir}/lib/" || exit 1
    adb push "${program_dir}/libggml-base.so" "${deviceDir}/lib/" || exit 1
    adb push "${program_dir}/libllava_shared.so" "${deviceDir}/lib/" || exit 1
}

function take_photo() {
    photo_path="${deviceDir}/current_photo.jpg"
    
    # Get the most recent photo file only
    echo "Looking for most recent photo..."
    latest_photo=$(adb shell "ls -t /storage/emulated/0/DCIM/Camera/*.jpg | head -n 1" | tr -d '\r')
    
    if [ -z "$latest_photo" ]; then
        echo "No photos found in camera directory"
        exit 1
    fi
    
    echo "Found most recent photo at: $latest_photo"
    
    # Copy to our working directory
    adb shell "cp \"$latest_photo\" \"$photo_path\"" || {
        echo "Failed to copy photo to target location"
        exit 1
    }
    
    # Set proper permissions
    adb shell "chmod 666 $photo_path"
    
    # Verify file
    if adb shell "[ -f $photo_path ]" && adb shell "[ -s $photo_path ]"; then
        echo "Photo saved successfully as: current_photo.jpg"
        adb shell "ls -l $photo_path"
    else
        echo "Failed to save photo"
        exit 1
    fi
}

function run_inference() {
    output_file="${deviceDir}/inference_$(date +%Y%m%d_%H%M%S).txt"
    
    echo "Running inference..."
    adb shell "cd ${deviceDir} && LD_LIBRARY_PATH=${deviceDir}/lib ${deviceDir}/${binName} \
        -m ${deviceDir}/${llama_name} \
        --mmproj ${deviceDir}/${projector_name} \
        -t ${n_threads} \
        --image ${deviceDir}/current_photo.jpg \
        -p \"${prompt}\" \
        > ${output_file} 2>&1"

    # Pull and display results
    adb pull "${output_file}" "${saveDir}"
    echo "Results:"
    cat "${saveDir}/$(basename ${output_file})"
}

function init_model() {
    echo "Initializing model..."
    # Create a background process to keep the model loaded
    adb shell "cd ${deviceDir} && LD_LIBRARY_PATH=${deviceDir}/lib ${deviceDir}/${binName} \
        -m ${deviceDir}/${llama_name} \
        --mmproj ${deviceDir}/${projector_name} \
        -t ${n_threads} \
        --interactive \
        > ${deviceDir}/model.log 2>&1 &"
    
    # Save the process ID
    model_pid=$(adb shell "pgrep -f ${binName}")
    echo "Model initialized with PID: $model_pid"
    
    # Wait for model to load
    sleep 5
}

function cleanup() {
    echo "Cleaning up..."
    if [ ! -z "$model_pid" ]; then
        adb shell "kill $model_pid"
    fi
    exit 0
}

# Set up cleanup on script exit
trap cleanup EXIT

# Main execution
check_adb
check_device

# First-time setup
if [ "$1" == "--setup" ]; then
    echo "Performing first-time setup..."
    setup_device
    exit 0
fi

# Initialize model once
init_model

# Normal operation
while true; do
    echo "1. Take new photo"
    echo "2. Exit"
    read -p "Choose an option (1-2): " choice
    
    case $choice in
        1)
            take_photo
            run_inference
            ;;
        2)
            echo "Exiting..."
            exit 0
            ;;
        *)
            echo "Invalid option"
            ;;
    esac
done 