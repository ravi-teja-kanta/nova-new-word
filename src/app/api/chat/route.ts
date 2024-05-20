import { openai } from '@ai-sdk/openai';
import { Message, StreamingTextResponse, streamText } from 'ai';
import { intitialiseLesson, updateLesson } from './newWordManager';


const system = `
    You are a helpful and understanding teacher called nova. 
    You are assigned the task of teaching new words to a user who is a 10 year old.
`
export async function POST(req: Request) {
    const { messages, word } = await req.json();
    
    if (messages.length === 2) intitialiseLesson(word);
    else {
        messages.push(await updateLesson(messages[messages.length - 1]));
    }

    const result = await streamText({
        system,
        model: openai('gpt-4'),
        messages,
    });

    return new StreamingTextResponse(result.toAIStream());
}