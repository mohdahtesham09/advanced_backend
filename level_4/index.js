import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
// import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { ChatGroq } from "@langchain/groq"
import { Annotation, StateGraph, MessagesAnnotation, MemorySaver, START, END } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { TavilySearch } from "@langchain/tavily";



dotenv.config();

const app = express();
const port = 5000;

app.use(express.json());

// ! With out langchain

// const ai = new GoogleGenAI({
//   apiKey: process.env.GEMINI_API_KEY,
// });



// app.post("/ai", async (req, res) => {
//   try {
//     const { input } = req.body;

//     const response = await ai.models.generateContent({
//       model: "gemini-2.5-flash",
//       contents: input,
//       config:{
//         systemInstruction: "You are an assistant. Your name is Jarvis."
//       }
//     });

//     console.log(response.text)

//     return res.status(200).json({
//       success: true,
//       answer: response.text,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// });

// app.get("/", (req, res) => {
//   return res.status(200).json({ message: "server start" });
// });



// ? With langchain



// const State = Annotation.Root({
//   prompt: Annotation,
//   aiMsg: Annotation
// })



const tool = new TavilySearch({
  maxResults: 2,
  topic: "general",
});

const checkPointer  = new MemorySaver()

const tools = [tool]
const toolNode = new ToolNode(tools)

const llm = new ChatGroq({
  model: "llama-3.3-70b-versatile",
  apiKey: process.env.GROQ_API_KEY,
  temperature: 0.7,
  maxTokens: 100,
  maxRetries: 2

}).bindTools(tools)



const callLLM = async (state) => {
  console.log("state", state)
  const response = await llm.invoke([
   {
  role: "system",
  content: `
You are Jarvis, an intelligent AI assistant.

Your primary goal is to provide accurate, helpful, and concise answers.

Guidelines:

- Always use conversation memory first before answering.
- Remember previous messages in the conversation and use them whenever relevant.
- Answer naturally like a human assistant.

Tool Usage:
- Use external tools ONLY when the answer requires real-time or internet information.
- Examples:
  - Current weather
  - Latest news
  - Live sports scores
  - Stock prices
  - Current events
  - Recent technology updates

Do NOT use tools for:
- Greetings
- Personal conversations
- Memory-based questions
- General knowledge
- Coding questions
- Mathematics
- Explanations
- Writing tasks

If the answer can be generated from memory or your own knowledge, answer directly without using any tool.

When using a tool:
- Call the appropriate tool only once.
- After receiving the tool result, generate the final answer instead of calling the tool again.

Be clear, accurate, and professional in every response.
`
},
    ...state.messages
  ])

  return {messages:[response]}


}

const shouldContinue = (state) => {
  const lastMessage = state.messages[state.messages.length - 1]
  if(lastMessage.tool_calls.length > 0){
    return "tools"
  }else{
    return "__end__"
  }

}

const graph = new StateGraph(MessagesAnnotation)
.addNode("agent", callLLM)
.addNode("tools", toolNode)
.addEdge("__start__", "agent")
.addEdge("tools","agent")
.addConditionalEdges("agent", shouldContinue)
.compile({ checkpointer: checkPointer })




app.post("/ai", async (req, res) => {
  const {input} = req.body;

  const response = await graph.invoke({messages:[
    {
      role: "user",
      content: input
    }

  ]},
  { configurable: { thread_id: "user123" } }
)
  console.log(response.messages)
  
  return res.status(200).json({"ai": response.messages[response.messages.length - 1].content})

})


app.get("/", (req, res) => {
  return res.status(200).json({message: "server start"});
})
app.listen(port, () => {
  console.log("server start");
});

