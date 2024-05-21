import { MCQ, questions } from "@/app/models/questions";
import { State, Event } from "@/app/models/state";
import { Message } from "ai";
import { didUserUnderstandTheExplanation, didTheUserAnswerCorrectlyToTheQuestion } from "./openAIManager";


let lesson: Lesson;

type Lesson = {
    currentState: State,
    word: string,
    numberOfQuestionsAsked: number,
    score: number,
    lastEvent: Event,
    lastQuestionAsked?: MCQ
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
                    if (lesson.numberOfQuestionsAsked === 3 && lesson.score >= 2) return "END"
                    else if (lesson.numberOfQuestionsAsked === 3 && lesson.score < 2) return "EXPLAIN_WORD"
                    else return "ASK_QUESTION"
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
         // this is hack to determine questions based on index,TODO: make it random, store the current question in lesson obj
        let didUserAnswerCorrectly = await didTheUserAnswerCorrectlyToTheQuestion(message.content, lesson.lastQuestionAsked!!);
        if (didUserAnswerCorrectly) return "USER_RESPONDS_CORRECTLY_TO_QUESTION";
        else return "USER_RESPONDS_WRONG_TO_QUESTION";
    }
    console.error("event not updated")
    return lesson.lastEvent;
}


function getNextQuestion(lesson: Lesson) {
    lesson.lastQuestionAsked = questions[lesson.word][lesson.numberOfQuestionsAsked];
    return lesson.lastQuestionAsked;
}

function nextAction(state: State, event: Event): Message {
    switch(state) {
        case "EXPLAIN_WORD":
            switch(event) {
                case "USER_DID_NOT_UNDERSTAND":
                    return { id: "explain_again", role: "system", content: `Please explain the word again. Ask if they understood it.` }
                case "USER_UNDERSTOOD":
                    return {
                        id: "move_on_to_questions",
                        role: "system",
                        content: `Appreciate the user for learning the word. Now ask the following multiple choice question: 
                            ${JSON.stringify(getNextQuestion(lesson))}
                        `} // this is hacky. TODO: refactor this not update state here.
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
        case "ASK_QUESTION":
            switch(event) {
                case "USER_UNDERSTOOD":
                    return {
                        id: "move_on_to_questions",
                        role: "system",
                        content: `Appreciate the user for learning the word. Now ask the following multiple choice question: 
                            ${JSON.stringify(getNextQuestion(lesson))}
                        `}
                case "USER_RESPONDS_CORRECTLY_TO_QUESTION":
                    if (lesson.numberOfQuestionsAsked === 3 && lesson.score >= 2) {
                        return {
                            id: "end",
                            role: "system",
                            content: `Appreciate the user for getting the answer correctly. Congratulate the user for completing the session. Mention that the session is conluded.`
                        }
                    } else if (lesson.numberOfQuestionsAsked === 3 && lesson.score < 2) {
                        return {
                            id: "end",
                            role: "system",
                            content: `Appreciate the user for getting the answer correctly but Suggest that its better you explain the word again and begin explanation.`
                        }
                    }
                    else {
                        return {
                            id: "ask_next_question" + lesson.numberOfQuestionsAsked,
                            role: "system",
                            content: `Appreciate the user for getting the answer correctly. Now ask the next following multiple choice question: 
                                ${JSON.stringify(getNextQuestion(lesson))}`
                        }
                    }
                case "USER_RESPONDS_WRONG_TO_QUESTION":
                    if (lesson.numberOfQuestionsAsked === 3 && lesson.score >= 2) {
                        return {
                            id: "end",
                            role: "system",
                            content: `Inform the user that the response was incorrect and also Congratulate the user for completing the session. Mention that the session is conluded.`
                        }
                    } else if (lesson.numberOfQuestionsAsked === 3 && lesson.score < 2) {
                        return {
                            id: "end",
                            role: "system",
                            content: `Appreciate the user for getting the answer correctly but Suggest that its better you explain the word again and begin explanation.`
                        }
                    } else {
                        return {
                            id: "ask_next_question" + lesson.numberOfQuestionsAsked,
                            role: "system",
                            content: `Inform the user that the response was incorrect. Encourage them to answer the next multiple choice question: 
                                ${JSON.stringify(getNextQuestion(lesson))}`
                        }
                    }
                    
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
        
    }
    console.error("next action not updated");
    return {id: "Nothing", role: "system", content: ""}
}

function updateState(lesson: Lesson, event: Event) {
    // after the session ends, refresh the score and question numbers again.
    // maintain an END state.
    if (event === "USER_RESPONDS_CORRECTLY_TO_QUESTION") lesson.score++;
    if (lesson.currentState === "ASK_QUESTION") lesson.numberOfQuestionsAsked++;


    let nextState = getNextState(lesson, event);
    
    if (nextState === "EXPLAIN_WORD" && 
            (
                event === "USER_RESPONDS_CORRECTLY_TO_QUESTION" || 
                event === "USER_RESPONDS_WRONG_TO_QUESTION"
            )
    ) { // condition to explain again.
        // reset question index,
        lesson.numberOfQuestionsAsked = 0;
        lesson.score = 0;
    }

    lesson.currentState = nextState;
    lesson.lastEvent = event;
}
export async function updateLesson(latestUserMessage: Message) {
    
    const currentEvent = await extractEvent(lesson, latestUserMessage);
    
    updateState(lesson, currentEvent);
    const nextPrompt = nextAction(lesson.currentState, currentEvent);

    console.log("updated state", lesson);
    return nextPrompt;
}