"use client";

import React, { useState } from "react";
import axios from "axios";

const GeminiTest = () => {
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    try {
      const response = await axios.post("/api/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setDescription(response.data.description);
    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 animate-fade-in">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Gemini Test</h1>
        <p className="text-slate-400">Upload an image and get a description</p>
      </header>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="file" onChange={handleFileChange} />
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Uploading..." : "Upload"}
        </button>
      </form>

      {description && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-white">Description</h2>
          <p className="text-white">{description}</p>
        </div>
      )}
    </div>
  );
};

export default GeminiTest;