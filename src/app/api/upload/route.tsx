import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { writeFile } from "fs/promises";
import { VertexAI } from "@google-cloud/vertexai";

const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || "";
const location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";
const modelName = "gemini-pro-vision";

const vertexAI = new VertexAI({ project: projectId, location });
const generativeVisionModel = vertexAI.preview.getGenerativeModel({
  model: modelName,
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    // Save file to disk
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
    const filePath = path.join(process.cwd(), "public/uploads", fileName);
    await writeFile(filePath, buffer);

    // Convert local file to base64
    const base64Data = fs.readFileSync(filePath).toString("base64");

    // Create request with user prompt and file
    const userPrompt = {
      text: "Describe the content of this image:",
    };
    const filePart = {
      inlineData: {
        data: base64Data,
        // Update mimeType if needed (png, jpeg, etc.)
        mimeType: "image/jpeg",
      },
    };

    // The request must follow Vertex AI's chat format
    const request = {
      contents: [
        {
          role: "user",
          parts: [userPrompt, filePart],
        },
      ],
    };

    // Call Gemini Vision
    const responseStream = await generativeVisionModel.generateContentStream(request);
    const fullResponse = await responseStream.response;
    const textResult = fullResponse.candidates[0]?.content?.parts?.[0]?.text || "No response";

    return NextResponse.json({ description: textResult }, { status: 201 });
  } catch (err) {
    console.error("Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}