"use client"
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Message, useChat } from "ai/react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function Page() {
	const { word } = useParams()
	// const [word, setWord] = useState<string>("tedious");

	const { messages, input, handleInputChange, handleSubmit } = useChat({
		api: '../api/chat',
		body: {
			word
		},
		initialInput: "Lets begin. Answer as briefly as possible. use onely one line to answer",
		initialMessages: [
			{
				id: "1", 
				role: "system",
				content: `Explain the word sacrosanct with its usage. Divide your response into 2 paras (one explanation and the other usage). 
						  Be concise. Ask if the user understood it in a new paragraph at the last. Start with the explanation directly.` 
			}
		]
	});

	return (
		<div className='flex flex-col px-24 py-6 border-black'>
			<div className="flex border rounded p-2">
				<div className="flex space-x-2 items-center">
					<div>Word of the day:</div>
					<div className="font-semibold text-lg">{word}</div>
				</div>
			</div>
			
			<div className='flex flex-col justify-between border h-[90vh] p-4 space-y-2'>
				<div className='w-1/2 mx-auto overflow-auto flex flex-col space-y-4 py-4 px-2'>
					{messages.map(displayMessage)}
				</div>
				<form onSubmit={handleSubmit} className="flex mt-auto w-1/2 mx-auto space-x-2" >
					<Input
						name="prompt"
						value={input}
						onChange={handleInputChange}
						id="input"
						className='border'
					/>
					<Button type="submit">Reply</Button>
				</form>
			</div>
		</div>
	);
	
	function displayMessage(message: Message) {
		if (message.role === 'assistant') {
			return (
				<Card key={message.id} className="mr-auto">
					<CardHeader>
						<CardTitle>Nova</CardTitle>
					</CardHeader>
					<CardContent>
						<CardDescription>{message.content}</CardDescription>	
					</CardContent>
				</Card>
			)
		}
		if (message.role === "user") {
			return (
				<Card key={message.id} className="bg-blue-100 ml-auto w-1/2">
					<CardHeader>
						<CardTitle>Kiddo</CardTitle>
					</CardHeader>
					<CardContent>
						<CardDescription>{message.content}</CardDescription>
					</CardContent>
				</Card>
			)
		}
	}
}