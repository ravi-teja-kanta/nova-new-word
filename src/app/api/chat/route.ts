import { StreamingTextResponse } from 'ai';
import { getNextActionForTheAgent, intitialiseLesson, updateLesson } from '../../../useCases/lesson/lessonManager';
import { completeChat } from '../../../useCases/openAI/openAIManager';



export async function POST(req: Request) {
    const { messages, word } = await req.json();
    
    if (messages.length === 2) intitialiseLesson(word);
    else {
        const lastMessage = messages[messages.length - 1];
        await updateLesson(lastMessage); 
    }
    const systemMessage = await getNextActionForTheAgent()
    messages.push(systemMessage);

    return await completeChat(messages);
}