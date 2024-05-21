import { MCQ } from "@/app/models/questions";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

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