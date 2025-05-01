import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOllama } from "@langchain/ollama";
import { z } from "zod";
import { getDb } from "./db/getDb";
import readline from 'readline/promises';

const rl = readline.createInterface({
   input: process.stdin,
   output: process.stdout,
});

// this prompt from PromptHub
const prompt = ChatPromptTemplate.fromTemplate(`
   Given an input question, create a syntactically correct {dialect} query to run to help find the answer. Unless the user specifies in his question a specific number of examples they wish to obtain, always limit your query to at most {top_k} results. You can order the results by a relevant column to return the most interesting examples in the database.

   Never query for all the columns from a specific table, only ask for a the few relevant columns given the question.

   Pay attention to use only the column names that you can see in the schema description. Be careful to not query for columns that do not exist. Also, pay attention to which column is in which table.

   Only use the following tables:
   {table_info}
   Question: {input}
`)

const model = new ChatOllama({
   model: "gemma3",
   temperature: 0,
   maxRetries: 2,
});

const structuredModel = model.withStructuredOutput(
   z.object({ query: z.string().describe("Syntactically valid SQL query.") })
);
async function writeQuery(question: string) {
   const db = await getDb();

   const promptValue = await prompt.invoke({
      dialect: db.appDataSourceOptions.type,
      top_k: 10,  // default LIMIT for results
      table_info: await db.getTableInfo(), //get info about table structures
      input: question,
    });

    const result = await structuredModel.invoke(promptValue);

    return { query: result.query };
}

async function executeQuery(query: string) {
   const db = await getDb();
   const results = await db.run(query);

   return results;
}

async function main() {

   while(true) {
      const userInput = await rl.question('What do you want to know about the database?\n > ');

      const { query } = await writeQuery(userInput);

      console.log('\n----\n');
      console.log(query);
      console.log('\n----\n');

      const userConsent = await rl.question('Do you wish to run the above query? (y/n)\n > ');

      const shouldRunQuery = userConsent.toLowerCase().startsWith('y');
      if (!shouldRunQuery) {
         continue;
      }

      console.log('Running query ...\n');
      const results = await executeQuery(query);

      console.log(`Results: \n`);
      console.log(results);
      console.log('\n----\n');

   }
}

main();