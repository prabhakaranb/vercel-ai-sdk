import { ModelMessage, streamText, tool, isStepCount } from 'ai';
import { ollama} from 'ollama-ai-provider-v2';
import { z } from 'zod';
import 'dotenv/config';
import * as readline from 'node:readline/promises';

const terminal = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const messages: ModelMessage[] = [];

async function main() {
    while (true) {
        const userInput = await terminal.question('You: ');

        messages.push({
            role: 'user',
            content: userInput,
        });

        const result = streamText({
            model: ollama('llama3.2'),
            messages,
            tools: {
                weather: tool({
                    description: 'Get the weather for a location. (fahrenheit)',
                    inputSchema: z.object({
                        location: z.string().describe('The location to get the weather for.'),
                    }),
                    execute: async ({ location }) => {
                        const temperature = Math.round(Math.random() * (90 - 32) + 32);

                        return {
                            location,
                            temperature,
                        }
                    }
                }),
                convertFahrenheitToCelsius: tool({
                    description: 'Convert a temperature in Fahrenheit to Celsius.',
                    inputSchema: z.object({
                        temperature: z.number().describe('The temperature in Fahrenheit to convert to Celsius.'),
                    }),
                    execute: async ({ temperature }) => {
                        const celsius = (temperature - 32) * (5 / 9);
                        return {
                            celsius,
                        }
                    },
                }),
            },
            stopWhen: isStepCount(5),
            onStepEnd: async ({ toolResults }) => {
                if (toolResults.length > 0) {
                    console.log(`Tool Results: ${JSON.stringify(toolResults)}`);
                }
            },
        });

        let fullResponse = '';
        process.stdout.write('\nAI Assistant: ');
        for await (const delta of result.textStream) {
            fullResponse += delta;
            process.stdout.write(delta);
        }

        process.stdout.write('\n\n');

        console.log(await result.toolCalls);
        console.log(await result.toolResults);
        messages.push({
            role: 'assistant',
            content: fullResponse,
        });
    }
}

main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
});
