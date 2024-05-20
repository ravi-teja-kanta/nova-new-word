import { questions } from "@/app/models/questions";
import { State, Event } from "@/app/models/state";
import { Message } from "ai";
import { didUserUnderstandTheExplanation, didTheUserAnswerCorrectlyToTheQuestion } from "./openAIManager";


let lesson: Lesson;

type Lesson = {
    currentState: State,
    word: string,
    numberOfQuestionsAsked: number,
    score: number,
    lastEvent: Event
}

function getNextState(lesson: Lesson, event: Event): State {
    switch (lesson.currentState) {
        case "IDLE":
            switch(event) {
                case "START":
                    return "EXPLAIN_WORD"
            }
        case "EXPLAIN_WORD":
            switch(event) {
                case "USER_UNDERSTOOD":
                    return "ASK_QUESTION"
                case "USER_DID_NOT_UNDERSTAND":
                    return "EXPLAIN_WORD"
            }
        case "ASK_QUESTION":
            switch(event) { // TODO: Refactor this later.
                case "USER_RESPONDS_CORRECTLY_TO_QUESTION":
                case "USER_RESPONDS_WRONG_TO_QUESTION":
                    if (lesson.numberOfQuestionsAsked < 3) return "ASK_QUESTION"
                    else if (lesson.score < 2) return "EXPLAIN_WORD_AGAIN"
                    else return "END"
            }
    }
    console.error("something is wrong !");
    return lesson.currentState;
}


export async function intitialiseLesson(word: string) {
    lesson = {
        currentState: "IDLE",
        word,
        numberOfQuestionsAsked: 0,
        score: 0,
        lastEvent: "SUCCESSFUL_COMPLETION" // just for initialisation. The cycle of life maybe... :)
    }
    lesson.currentState = getNextState(lesson, "START");
    console.log("Initialized", lesson);
}
export async function extractEvent(lesson: Lesson, message: Message): Promise<Event> {
    
    if (lesson.currentState === "EXPLAIN_WORD") {
        let didUserUnderstand = await didUserUnderstandTheExplanation(message.content);
        console.log("sentiment:", didUserUnderstand);
        if (didUserUnderstand) return "USER_UNDERSTOOD";
        else return "USER_DID_NOT_UNDERSTAND";
    }
    if (lesson.currentState === "ASK_QUESTION") {
        let currentQuestion = questions[lesson.word][lesson.numberOfQuestionsAsked]; // this is hack to determine questions based on index,TODO: make it random, store the current question in lesson obj
        let didUserAnswerCorrectly = await didTheUserAnswerCorrectlyToTheQuestion(message.content, currentQuestion);
        if (didUserAnswerCorrectly) return "USER_RESPONDS_CORRECTLY_TO_QUESTION";
        else return "USER_RESPONDS_WRONG_TO_QUESTION";
    }
    
    return lesson.lastEvent;
}


function getNextQuestion(word: string, numberOfQuestionsAsked: number) {
    return questions[word][numberOfQuestionsAsked];
}

function nextAction(state: State, event: Event): Message {
    switch(state) {
        case "EXPLAIN_WORD":
            switch(event) {
                case "USER_DID_NOT_UNDERSTAND":
                    return { id: "explain_again", role: "system", content: `Please explain the word again.` }
                case "USER_UNDERSTOOD":
                    return {
                        id: "move_on_to_questions",
                        role: "system",
                        content: `Appreciate the user for learning the word. Now ask the following multiple choice question: 
                            ${JSON.stringify(getNextQuestion(lesson.word, lesson.numberOfQuestionsAsked))}
                        `} // this is hacky. TODO: refactor this not update state here.
            }
        case "ASK_QUESTION":
            lesson.numberOfQuestionsAsked++;
            switch(event) {
                case "USER_RESPONDS_CORRECTLY_TO_QUESTION":
                    lesson.score++; //TODO: remove state updates from here.
                    return {
                        id: "ask_next_question" + lesson.numberOfQuestionsAsked,
                        role: "system",
                        content: `Appreciate the user for getting the answer correctly. Now ask the next following multiple choice question: 
                            ${JSON.stringify(getNextQuestion(lesson.word, lesson.numberOfQuestionsAsked))}
                    `} // TODO: same here
                case "USER_RESPONDS_WRONG_TO_QUESTION":
                    return {
                        id: "ask_next_question" + lesson.numberOfQuestionsAsked,
                        role: "system",
                        content: `Inform the user that the response was incorrect. Encourage them to answer the next multiple choice question: 
                            ${JSON.stringify(getNextQuestion(lesson.word, lesson.numberOfQuestionsAsked))}
                    `}
            }
        case "END":
            switch(event) {
                case "USER_RESPONDS_CORRECTLY_TO_QUESTION":
                    return {
                        id: "end",
                        role: "system",
                        content: `Appreciate the user for getting the answer correctly. Congratulate the user for completing the session. Mention that the session is conluded.`
                    }
                case "USER_RESPONDS_WRONG_TO_QUESTION":
                    return {
                        id: "end",
                        role: "system",
                        content: `Inform the user that the response was incorrect and also Congratulate the user for completing the session. Mention that the session is conluded.`
                    }
            }
        case "EXPLAIN_WORD_AGAIN":
            switch(event) {
                case "USER_RESPONDS_CORRECTLY_TO_QUESTION":
                    return {
                        id: "end",
                        role: "system",
                        content: `Appreciate the user for getting the answer correctly but Suggest that its better you explain the word again and begin explanation.`
                    }
                case "USER_RESPONDS_WRONG_TO_QUESTION":
                    return {
                        id: "end",
                        role: "system",
                        content: `Inform the user that the response was incorrect. Suggest that its better you explain the word again and begin explanation.`
                    }
            }
    }
    return {id: "Nothing", role: "system", content: ""}
}

function updateState(lesson: Lesson, event: Event) {
    // after the session ends, refresh the score and question numbers again.
    // maintain an END state.
    let nextState = getNextState(lesson, event);

    lesson.currentState = nextState;
    lesson.lastEvent = event;
}
export async function updateLesson(latestUserMessage: Message) {
    
    const currentEvent = await extractEvent(lesson, latestUserMessage);
    const nextPrompt = nextAction(lesson.currentState, currentEvent);
    
    updateState(lesson, currentEvent);
    console.log("updated state", lesson);
    return nextPrompt;
}