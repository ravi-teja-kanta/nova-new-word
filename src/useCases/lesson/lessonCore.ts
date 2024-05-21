import { MCQ, questions } from "@/app/models/questions";
import { State, Event } from "@/app/models/lesson";
import { Message } from "ai";
import { didUserUnderstandTheExplanation, didTheUserAnswerCorrectlyToTheQuestion } from "../openAI/openAIManager";



export type Lesson = {
    currentState: State,
    word: string,
    numberOfQuestionsAsked: number,
    score: number,
    lastEvent: Event,
    lastQuestionAsked?: MCQ
}

function didUserCompleteTheLesson(lesson: Lesson) {
    return lesson.numberOfQuestionsAsked === 3 && lesson.score >= 2;   
}

function didUserFailTheLesson(lesson: Lesson) {
    return lesson.numberOfQuestionsAsked === 3 && lesson.score < 2
}

export function getNextState(lesson: Lesson, event: Event): State {
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
            switch(event) {
                case "USER_RESPONDS_CORRECTLY_TO_QUESTION":
                case "USER_RESPONDS_WRONG_TO_QUESTION":
                    if (didUserCompleteTheLesson(lesson)) return "END"
                    else if (didUserFailTheLesson(lesson)) return "EXPLAIN_WORD"
                    else return "ASK_QUESTION"
            }
    }
    console.error("something is wrong !");
    return lesson.currentState;
}


export async function getEvent(lesson: Lesson, message: Message): Promise<Event> {
    
    if (lesson.currentState === "EXPLAIN_WORD") {
        let didUserUnderstand = await didUserUnderstandTheExplanation(message.content);
        console.log("sentiment:", didUserUnderstand);
        if (didUserUnderstand) return "USER_UNDERSTOOD";
        else return "USER_DID_NOT_UNDERSTAND";
    }
    if (lesson.currentState === "ASK_QUESTION") {
        let didUserAnswerCorrectly = await didTheUserAnswerCorrectlyToTheQuestion(message.content, lesson.lastQuestionAsked!!);
        if (didUserAnswerCorrectly) return "USER_RESPONDS_CORRECTLY_TO_QUESTION";
        else return "USER_RESPONDS_WRONG_TO_QUESTION";
    }
    console.error("event not updated")
    return lesson.lastEvent;
}


export function getNextQuestion(lesson: Lesson) {
    lesson.lastQuestionAsked = questions[lesson.word][lesson.numberOfQuestionsAsked];
    return lesson.lastQuestionAsked;
}

export function getNextPrompt(lesson: Lesson): Message {
    switch(lesson.currentState) {
        case "EXPLAIN_WORD":
            switch(lesson.lastEvent) {
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
            switch(lesson.lastEvent) {
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
            switch(lesson.lastEvent) {
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

export function updateState(lesson: Lesson, event: Event) { // all state updates happen here.
  
    if (event === "USER_RESPONDS_CORRECTLY_TO_QUESTION") lesson.score++;
    if (lesson.currentState === "ASK_QUESTION") lesson.numberOfQuestionsAsked++;


    let nextState = getNextState(lesson, event);
    
    if (
        nextState === "EXPLAIN_WORD" && // when the user fails to get desired score, we reexplain
        (
            event === "USER_RESPONDS_CORRECTLY_TO_QUESTION" || 
            event === "USER_RESPONDS_WRONG_TO_QUESTION"
        )
    ) {
        lesson.numberOfQuestionsAsked = 0;
        lesson.score = 0;
    }

    lesson.currentState = nextState;
    lesson.lastEvent = event;
}