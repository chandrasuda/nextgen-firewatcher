import { ChatOpenAI } from 'langchain/chat_models/openai';
import { HumanMessage, SystemMessage } from 'langchain/schema';
import { DroneController } from './droneController';

export class LangChainAgent {
  private model: ChatOpenAI;
  private droneController: DroneController;
  
  constructor(openAIKey: string, droneController: DroneController) {
    this.model = new ChatOpenAI({ 
      openAIApiKey: openAIKey,
      modelName: 'gpt-4'
    });
    this.droneController = droneController;
  }

  async processCommand(command: string): Promise<string> {
    const systemPrompt = new SystemMessage(
      `You are an AI assistant controlling a drone and Meta smart glasses system. 
       Parse user commands and respond with actionable steps.
       Focus on safety and clear communication.`
    );

    const userMessage = new HumanMessage(command);

    try {
      const response = await this.model.call([systemPrompt, userMessage]);
      const action = this.parseAction(response.content);
      
      if (action.type === 'DRONE_SURVEY') {
        await this.executeDroneSurvey(action.params);
      }

      return response.content;
    } catch (error) {
      console.error('Error processing command:', error);
      return 'Sorry, I encountered an error processing your command.';
    }
  }

  private async executeDroneSurvey(params: any): Promise<void> {
    await this.droneController.takeoff(params.altitude || 30);
    // Execute survey pattern...
  }

  private parseAction(response: string): { type: string; params: any } {
    // Parse LLM response into structured command
    return { type: 'DRONE_SURVEY', params: {} };
  }
} 