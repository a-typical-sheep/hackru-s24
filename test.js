import OpenAI from "openai";

const openai = new OpenAI({
    // omitted
    "baseURL": "",
    "apiKey": ""
});

const stream = await openai.chat.completions.create({
    "model": "tgi",
    "messages": [
        {
            "role": "user",
            "content": "What is deep learning?"
        }
    ],
    "max_tokens": 150,
    "stream": true
});

for await (const chunk of stream) {
	process.stdout.write(chunk.choices[0]?.delta?.content || '');
}