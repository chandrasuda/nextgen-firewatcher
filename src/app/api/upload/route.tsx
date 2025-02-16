/*
import { NextResponse } from "next/server";
import { GoogleAIFileManager, FileState } from "@google/generative-ai/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
// Import the prebuilt ReAct agent creator from LangGraph’s functional API
import { createReactAgent } from "@langchain/langgraph/prebuilt";

export async function POST(req: Request) {
  try {
    // Parse the incoming form data and get the file.
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
    const mimeType = file.type || "video/mp4";

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not defined in environment variables.");
    }

    // Define custom tools that the agent can call:
    const uploadTool = {
      name: "UploadFile",
      description: "Uploads a file to Gemini and returns file metadata.",
      func: async () => {
        const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);
        const uploadResponse = await fileManager.uploadFile({
          data: buffer,
          fileName,
          mimeType,
        });
        console.log(`Uploaded file ${uploadResponse.file.displayName} as ${uploadResponse.file.uri}`);
        return uploadResponse.file;
      },
    };

    const pollTool = {
      name: "PollFile",
      description: "Polls the uploaded file until its processing is complete.",
      func: async (fileData: any) => {
        const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);
        let fileInfo = await fileManager.getFile(fileData.name);
        while (fileInfo.state === FileState.PROCESSING) {
          console.log("Waiting for file processing...");
          await new Promise((resolve) => setTimeout(resolve, 10000));
          fileInfo = await fileManager.getFile(fileData.name);
        }
        if (fileInfo.state === FileState.FAILED) {
          throw new Error("File processing failed.");
        }
        console.log(`File ${fileInfo.displayName} is now active at ${fileInfo.uri}`);
        return fileInfo;
      },
    };

    const generateTool = {
      name: "GenerateContent",
      description: "Generates directional instructions based on the file content.",
      func: async (fileData: any) => {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        const result = await model.generateContent([
          {
            fileData: {
              mimeType: fileData.mimeType,
              fileUri: fileData.uri,
            },
          },
          {
            text:
              "Using the provided video as well as additional data sources, determine exactly which direction to move to avoid fire hazards. " +
              "Return detailed instructions with timestamps and reasoning in JSON format.",
          },
        ]);
        return result.response.text();
      },
    };

    // Create the ReAct agent using the prebuilt helper.
    // The agent is configured with our custom tools and will internally decide the sequence.
    const agent = createReactAgent({
      tools: [uploadTool, pollTool, generateTool],
      llmConfig: { model: "gemini-1.5-pro", apiKey: GEMINI_API_KEY },
    });

    // Start the agent with a high-level instruction.
    const agentResponse = await agent.run(
      "Process the uploaded file: first, upload it; then, poll until it's ready; finally, generate detailed fire hazard avoidance instructions."
    );

    return NextResponse.json({ description: agentResponse }, { status: 201 });
  } catch (err) {
    console.error("Error processing input via ReAct agent:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

*/

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  console.log(req);
  return NextResponse.json({ message: "API is working!" }, { status: 200 });
}
