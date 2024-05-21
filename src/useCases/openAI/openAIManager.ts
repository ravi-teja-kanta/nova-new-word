import { MCQ } from "@/app/models/questions";
import { openai } from "@ai-sdk/openai";
import { generateText, Message, StreamingTextResponse, streamText } from "ai";

export async function didUserUnderstandTheExplanation(userResponse: string) {
    const result = await generateText({
        model: openai("gpt-4"),
        prompt: `Answer with true or false. Is the sentiment of the following sentence positive. The sentence is "${userResponse}"`
    });
    
    const response = result.text.toLocaleLowerCase();
    console.log("sentiment", userResponse, response);
    return response === "true"
}

export async function didTheUserAnswerCorrectlyToTheQuestion(userResponse: string, question: MCQ) {
    const result = await generateText({
        model: openai("gpt-4"),
        prompt: `Answer only with A,B,C,D, which option does the following response match closely to ${question.options.join(" ")}. Answer STRICTLY and ONLY with one character of the option name. response: "${userResponse}"`
    });
    
    const response = result.text.toLocaleLowerCase();
    console.log("results", response, question.correctAnswer.toLocaleLowerCase());
    return response === question.correctAnswer.toLocaleLowerCase()
}

export async function completeChat(messages: any[]) {
    const system = `
        You are a helpful and understanding teacher called nova. 
        You are assigned the task of teaching new words to a user who is a 10 year old.
    `
    const result =  await streamText({
        system,
        model: openai('gpt-4'),
        messages,
    });

    return new StreamingTextResponse(result.toAIStream())
}