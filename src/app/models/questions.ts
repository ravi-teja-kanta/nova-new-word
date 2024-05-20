export type MCQ = {
    question: string,
    options: string[],
    correctAnswer: string
}


export const questions = {
    "sacrosanct": [
        {
            "question": "What does sacrosanct mean?",
            "options": [
                "A) Easily broken",
                "B) Extremely holy and not to be violated",
                "C) Open for discussion",
                "D) Common and unimportant."
            ],
            "correctAnswer": "B"
        },
        {
            "question": "Which of the following is considered sacrosanct in many cultures?",
            "options": [
                "A) A favorite television show",
                "B) A place of worship",
                "C) A local supermarket",
                "D) A public park"
            ],
            "correctAnswer": "B"
        },
        {
            "question": "What type of objects could be described as sacrosanct?",
            "options": [
                "A) Everyday household items",
                "B) Religious artifacts",
                "C) Used clothing",
                "D) Old newspapers"
            ],
            "correctAnswer": "B"
        }
    ]
} as {
    [word: string]: MCQ[]
}