import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOllama, OllamaEmbeddings } from "@langchain/ollama";
import readline from 'readline/promises';
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { MultiFileLoader } from "langchain/document_loaders/fs/multi_file";
import path from 'path';
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { MarkdownTextSplitter, RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "langchain/document";
import { createRetrievalChain } from "langchain/chains/retrieval";

const rl = readline.createInterface({
   input: process.stdin,
   output: process.stdout,
});

const prompt = ChatPromptTemplate.fromTemplate(`
   Answer the user's question from the following context:
   {context}
   Question: {input}
`)

const model = new ChatOllama({
   model: "gemma3",
   temperature: 0,
   maxRetries: 2,
});

const embeddings = new OllamaEmbeddings({
   model: 'mxbai-embed-large'
});

// Create Vector Store
async function createVectorStore(docs: Document[]) {
   console.log('-- splitting documents...')
   // Split docs into smaller chunks for storage/retrieval
   const splitter = new MarkdownTextSplitter({
      chunkSize: 200,
      chunkOverlap: 20,
   });
   const splitDocs = await splitter.splitDocuments(docs);

   console.log('-- creating vector store...')
   // Store chunks inside of in-memory vector store
   const vectorStore = await MemoryVectorStore.fromDocuments(
      splitDocs,
      embeddings
   );

   console.log('-- returning vector store...')
   return vectorStore;
}

// Load all documents into a form
async function loadAllDocuments() {
   console.log('-- loading docs...')
   const loader = new MultiFileLoader(
      [
         path.join(__dirname, 'docs/culture.md'),
         path.join(__dirname, 'docs/hr-policy.md'),
         path.join(__dirname, 'docs/leaves-policy.md'),
         path.join(__dirname, 'docs/organisation.md'),
      ],
      {
        ".md": (path) => new TextLoader(path),
      }
   );
   const docs = await loader.load();

   console.log(`-- loaded ${docs.length} docs...`)
   return docs;
}

async function main() {
   console.log('Loading all documents ...');
   const docs = await loadAllDocuments();

   console.log('Splitting + inserting documents into vector store ...');
   const vectorStore = await createVectorStore(docs);

   // Create a retriever from vector store
   const retriever = vectorStore.asRetriever({
      k: 5 // num of documents to fetch
   });

   console.log('Creating retrieval chain ...');
   // Create a retrieval chain
   const retrievalChain = await createRetrievalChain({
      combineDocsChain: await createStuffDocumentsChain({
         llm: model,
         prompt,
       }),
      retriever,
   });

   while(true) {
      const userInput = await rl.question('\nWhat do you want to know about our company?\n > ');

      console.log('Invoking retrieval chain ...');
      const response = await retrievalChain.invoke({
         input: userInput,
      });

      // console.log(`Documents used:\n`)
      // console.log(response.context);
      // console.log('\n----\n');

      console.log(`Answer: \n`);
      console.log(response.answer);
   }
}

main();