import { Message } from "ai";
import { getEvent, getNextState, Lesson, getNextPrompt, updateState } from "./lessonCore";


let lesson: Lesson;

export async function intitialiseLesson(word: string) {
    lesson = {
        currentState: "IDLE",
        word,
        numberOfQuestionsAsked: 0,
        score: 0,
        lastEvent: "START"
    }
    lesson.currentState = getNextState(lesson, "START");
    console.log("lesson state: ", lesson.currentState, ", event: ", lesson.lastEvent);
}

export async function updateLesson(latestUserMessage: Message) {
    
    const currentEvent = await getEvent(lesson, latestUserMessage);
    
    updateState(lesson, currentEvent);
    console.log("lesson state: ", lesson.currentState, ", event: ", lesson.lastEvent);
}

export async function getNextActionForTheAgent() {
    return getNextPrompt(lesson)
}

