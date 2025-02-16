import { SensorData } from './types'
import dotenv from 'dotenv'

dotenv.config()

// The actual endpoint where our server will receive images from the messenger chat
const SERVER_PORT = process.env.SERVER_PORT || 3103
const SERVER_URL = `http://localhost:${SERVER_PORT}`

export interface MetaGlassesDevice {
  id: string
  name: string
  status: 'online' | 'offline'
  batteryLevel: number
}

export interface MetaVisionStream {
  type: 'normal' | 'thermal' | 'segmented' | 'depth' | 'augmented'
  url: string
}

interface GPTResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

class MetaVisionService {
  private openAiKey: string

  constructor(openAiKey: string) {
    this.openAiKey = openAiKey
  }

  async processImageFromGlasses(imageUrl: string) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openAiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4-vision-preview',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: 'What do you see in this image? Focus on identifying any potential hazards or areas of concern for firefighters.' },
                { type: 'image_url', url: imageUrl }
              ]
            }
          ],
          max_tokens: 500
        })
      })

      if (!response.ok) {
        throw new Error('Failed to process image with GPT-4 Vision')
      }

      const data = await response.json() as GPTResponse
      return data.choices[0].message.content
    } catch (error) {
      console.error('Error processing image:', error)
      throw error
    }
  }
}

// Create and export the service instance
export const metaVisionService = new MetaVisionService(process.env.OPENAI_API_KEY || '')

// Change to CommonJS style exports
export = {
  metaVisionService,
  MetaGlassesDevice,
  MetaVisionStream
}; 