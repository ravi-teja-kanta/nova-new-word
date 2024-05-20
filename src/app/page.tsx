'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Message, useChat } from 'ai/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Page() {
	const [word, setWord] = useState<string>("tedious");
	const router = useRouter();
	return (
		<div className='flex flex-col min-h-screen px-24 py-6 border-black items-center space-y-6'>
			<Card className='w-1/3 my-auto'>
				<CardHeader>
					<CardTitle className='text-2xl'>Word of the day</CardTitle>
				</CardHeader>
				<CardContent>
					<Select defaultValue={word} onValueChange={(v) => setWord(v)}>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Select word" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="tedious">Tedious</SelectItem>
							<SelectItem value="sacrosanct">Sacrosanct</SelectItem>
							<SelectItem value="unfathomable">Unfathomable</SelectItem>
						</SelectContent>
					</Select>
				</CardContent>
				<CardFooter>
					<Button className='w-1/2 mx-auto' onClick={() => router.push(`/learn/${word}`)}>Start learning</Button>
				</CardFooter>
			</Card>
		</div>
	);
}