# Welcome to NextGen Firefighter

**URL**: https://nextgenfirefiighters.vercel.app/

<img width="100%" style="width:100%" src="https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExOWRyZmppYmRuN2I3MGp6aDVpbmdrNmRneTJ4dTgwc3lmazVnYWVzeSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/VH1DDupIG9gVcJ92UD/giphy.gif">

# Inspiration
Firefighters operate in **resource-constrained**, high-stakes environments where reliable connectivity can be scarce. In many disaster zones, as seen in the recent LA fire, **Wi-Fi and cellular networks are often unavailable**. Despite these challenges, these brave men and women stand as **society’s protectors**, risking their lives to save others and preserve our communities.

In the U.S. alone, there were an estimated 374,300 residential building fires in 2022, leading to 2,720 deaths and \$10.82 billion in property loss. Wildfires can be equally catastrophic: in 2024, over 64,000 wildfires burned ~8.92 million acres, with human activity responsible for about 85% of them.

Having grown up in California, our team has witnessed firsthand the intensity of wildfires and the need for **on-device intelligence** and **drone reconnaissance for robust backend support**. Our goal with **PUSHPA: Pyro UAV System for High-risk Patrol and Alerting** is to empower these everyday heroes by providing them with **AI-driven, on-site decision support** even when **no Wi-Fi or cloud connectivity** is available.

# What It Does
**PUSHPA** (**P**redictive **U**AV and **S**mart **H**eadset for **P**roactive **A**ssistance) is a multi-component system that **integrates autonomous drones**, **wearable edge computing** (via Meta Glasses), and an **AI agentic layer** (LangChain):

1. **Wearable Meta Glasses**  
   - Perform on-device vision language model to interpret the situation
   - Offer spoken alerts when identifying structural weaknesses or obstacles.

2. **Autonomous Drone Integration**  
   - Uses MAVLink for flight commands and telemetry, with live video streaming.  
   - Commands from Meta glasses

3. **Agentic AI (LangChain)**  
   - Translates human commands (e.g., “Scan that building for hotspots”) into orchestrated tasks for the drone and glasses.  
   - Monitors real-time sensor/data feeds to adjust flight paths or highlight new hazards on the glasses interface.

4. **On-Device Edge Compute**  
   - Deployed a mobile vision-language model onto a Samsung device.  
   - Implements a “20x optimized convolution” ([code link](https://github.com/chandrasuda/nextgen-firewatcher)) (code is under myconv_cpu/) pipeline with **Fused Winograd** transforms for near-instant object detection—crucial in scenarios where **cloud APIs aren’t accessible**.

5. **Backend analytics for reconnaissance**
   - Live feed from drone and meta glasses
   - Live analytics from vision language model

Overall, PUSHPA **automates** many of the manual processes frontline responders face, so they can focus on saving lives and containing the emergency.

---

# How We Built It
1. **Hardware / Drone + Glasses Hacking**  
   - We lacked official SDKs for both the drone and Meta Glasses.  
   - We mirrored and screen-recorded the drone feed using OBS; for the glasses, we adapted an existing hack ([tutorial link](https://jovanovski.medium.com/part-2-getting-chatgpt-working-on-meta-smart-glasses-82e74c9a6e1e)) to inject custom overlays and run real-time inference.

2. **On-Device AI and Edge Compute**  
   - We deployed our AI models (MobileVLM, OCR pipeline, plus SAM v2 + Gemini for more advanced tasks) onto a Samsung Galaxy.  
   - Because Android restricts custom executables, we wrapped the inference engine in a specialized library and used partial model quantization to run everything locally, **no cloud required**.

3. **20x Optimized Convolution Pipeline**  
   - Implemented a “Hybrid Convolution” approach that switches between a direct convolution path and **Winograd F(2,3)** transforms for 3×3 kernels.  
   - Employed blocking (256-sized channel blocks) and partial loop unrolling to boost cache usage and throughput.  
   - Achieved a **20x speedup** in inference time on edge devices compared to naive baselines—key in **no-Wi-Fi** zones.

4. **Agentic AI with LangChain**  
   - A Node.js service receives user instructions from WhatsApp or the glasses.  
   - LangChain orchestrates sub-steps (e.g., “drone take off,” “survey building,” “report structural damage”), each of which calls our custom flight controller or the on-device vision pipeline.  
   - Results are relayed back as JSON or text, displayed in AR or sent via WhatsApp.

5. **Front-End and UI**  
   - Next.js + TypeScript for a live telemetry dashboard that merges drone video, sensor readings, and AI findings.  
   - WebSockets (Socket.IO) stream real-time updates for the user, showing bounding boxes or route maps.  
   - We also tested a “bookmarklet hack” to interface with Facebook Messenger for additional chat-based commands.

---

# Challenges We Ran Into
1. **No Official SDKs**  
   - Screen-recording the drone feed and hacking the glasses AR pipeline were not trivial. We had to rely on mirrored streams, custom overlays, and incomplete documentation.

2. **Android Restrictions**  
   - Deploying our optimized models on Samsung hardware required tricky workarounds to run custom inference. We built specialized wrappers to bypass prohibited executables.

3. **Model Integration**  
   - Merging the **SAM v2** segmentation model, **Gemini** data-generation model, and real-time sensor data (drone, glasses) into one cohesive system was extremely complex.

4. **Security & Robustness**  
   - We had to ensure that unauthorized users couldn’t hijack the drone or spam the glasses with misleading overlays. Proper token handling and prompt-based AI injection security were also essential.

---

# Accomplishments That We're Proud Of
- **Real-Time Edge Inference**  
  Achieving near-zero-latency AR overlays and object detection *without* relying on Wi-Fi or external cloud APIs.

- **Fused Winograd and 20x Speedup**  
  Demonstrating a robust on-device CNN pipeline tailored for local hardware, critical for disaster scenarios with minimal connectivity.

- **Unified UI + Synthetic Testing**  
  We designed an intuitive interface and used Gemini to generate synthetic data for validating our system under pseudo-wildfire conditions.

- **Agentic AI Orchestration**  
  Our LangChain-based system seamlessly coordinates instructions—from “count forested areas” to “locate potential hazards”—across drones, glasses, and the user’s smartphone or browser.

---

# What We Learned
1. **Edge AI is Crucial**  
   In many disasters, Wi-Fi is completely absent. On-device inference ensures continuous operation and real-time insights.

2. **Workarounds Are Sometimes Inevitable**  
   Official SDKs might be nonexistent. We learned to mirror video, hook into hidden AR pipelines, and build custom libraries for local inference.

3. **Complex Systems Demand Modular Design**  
   By keeping subsystems (drone logic, glasses inference, AI agent, UI) separate, we could iterate quickly without breaking the entire platform.

4. **Prompt Security & Input Validation**  
   Large Language Models can be manipulated by malicious prompts. We employed strict input checks and user authentication to thwart unauthorized access.

---

# What's Next for PUSHPA FIRE
- **Multi-User AR Collaboration**  
  Let entire squads of firefighters share real-time overlays—e.g., each vantage point combined into a global map.

- **Advanced Predictive Analytics**  
  Extend our system to forecast fire spread, structural collapse, or toxic gas pockets—again without needing a live internet connection.

- **Further Hardware Compatibility**  
  Officially integrate with more drone manufacturers and AR devices, removing the need for “hacks.”

- **Live Field Trials**  
  We plan to partner with fire departments and emergency services to test in real-world conditions, collect feedback, and refine.

- **Industrial and Agricultural Extensions**  
  Beyond firefighting, we can adapt the same architecture for warehouse inventory scanning, industrial inspections, or crop health mapping—particularly in remote areas lacking internet.

Ultimately, **PUSHPA** keeps first responders safer and better-informed, combining **drones, edge compute, and a powerful AI agent** into a cohesive system that saves time, protects property, and—most importantly—helps save lives.
