import express from 'express';
import cors from 'cors';
import { metaVisionService } from './meta-vision-service';
import fs from 'fs';
import path from 'path';
import { ProcessedData } from './types';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.SERVER_PORT || 3103;

app.use(cors());
app.use(express.json());

// Store processed data
const DATA_FILE = path.join(process.cwd(), 'public/data.json');

// Ensure the public directory exists
if (!fs.existsSync(path.join(process.cwd(), 'public'))) {
  fs.mkdirSync(path.join(process.cwd(), 'public'), { recursive: true });
}

// Endpoint to receive images from the Messenger chat
app.post('/api/gpt-4-vision', async (req, res) => {
  try {
    console.log('GPT4 Vision Request');
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'No image URL provided' });
    }

    console.log('Sending request to GPT4 Vision');
    const analysis = await metaVisionService.processImageFromGlasses(imageUrl);
    
    // Save the processed data
    const newData: ProcessedData = {
      timestamp: new Date().toISOString(),
      imageUrl,
      analysis
    };

    // Read existing data
    let existingData: ProcessedData[] = [];
    try {
      if (fs.existsSync(DATA_FILE)) {
        existingData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
      }
    } catch (error) {
      console.log('Creating new data file.');
    }

    // Add new data and save
    existingData.push(newData);
    fs.writeFileSync(DATA_FILE, JSON.stringify(existingData, null, 2));

    res.json({ success: true, analysis });
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Failed to process image' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 