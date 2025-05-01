import path from 'path';
import { z } from 'zod';
import { ChatOllama } from '@langchain/ollama'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { StructuredOutputParser } from 'langchain/output_parsers';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';

/**
 * An intelligent resume parser, that takes an unstructured document (e.g: a PDF) and returns a structured JSON describing
 * a candidate (e.g: an object with fields such as 'name', 'email', 'workExperience', 'education', etc), with full
 * type validation via Zod.
 */
const prompt = ChatPromptTemplate.fromTemplate(`
    You are an expert Human Resources (HR) director.
    You are tasked with reading a resume file's contents and returning formatted data from it.
    If you are unable to find any data that matches a given field in the format, you are to return null for that field,
    unless that field is an array, in which case you are to return an empty array.

    Formatting: {formatting}
    Context: {context}
`);

const model = new ChatOllama({
   model: "gemma3",
   temperature: 0,
   maxRetries: 2,
});

const zodOutputParser = StructuredOutputParser.fromZodSchema(z.object({
   name: z.string().describe('The name of the candidate').nullable(),
   email: z.string().describe('The email of the candidate').nullable(),
   address: z.string().describe('The address of the candidate').nullable(),
   workExperience: z.array(
      z.object({
         name: z.string().describe('The name of the workplace (e.g: Foobar Incorporated)').nullable(),
         title: z.string().describe('The job title the candidate had in this workplace (e.g: Personal Assistant)').nullable(),
         duration: z.string().describe('The duration the candidate has worked there (e.g: January 2012 - January 2045)').nullable(),
         description: z.string().describe('A freetext description of the candidate\'s responsibilities and accomplishments at the job').nullable()
      })
   ).describe('A list of the work experience history of the candidate'),

   education: z.array(
      z.object({
         name: z.string().describe('The name of the educational institute (e.g: University of Bazbar)'),
         title: z.string().describe('The educational title the candidate had in this institute (e.g: BA in Tapdancing)').nullable(),
         duration: z.string().describe('The duration the candidate has studied there (e.g: January 2012 - January 2045)').nullable(),
         description: z.string().describe('A freetext description of the candidate\'s accomplishments at the institute').nullable()
      })
   ).describe('A list of the education history of the candidate'),

   hobbies: z.array(
      z.object({
         name: z.string().describe('The name of the hobby').nullable(),
         description: z.string().describe('A freetext description of the hobby and how it relates to the candidate\'s employability').nullable()
      })
   ).describe('A list of the hobbies of the candidate'),
}))

async function main() {
   const docLoader = new PDFLoader(
      process.env.resume || path.join(__dirname, 'dummy_resume.pdf')
   );

   console.log(`Loading resume from ${docLoader.filePathOrBlob} ...`);
   const docContents = await docLoader.load();

   console.log(`Creating documents chain with output parser ...`);
   const chain = (
      await createStuffDocumentsChain({
         llm: model,
         prompt
      })
   )
   .pipe(zodOutputParser);

   console.log(`Passing resume to chain to extract structured data ...`);
   const results = await chain.invoke({
      context: docContents,
      formatting: zodOutputParser.getFormatInstructions()
   });

   console.log(`LLM structured output:`);
   console.log(results);
}

main();