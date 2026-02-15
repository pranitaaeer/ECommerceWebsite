import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import { StateGraph, Annotation } from "@langchain/langgraph";
import { tool } from "@langchain/core/tools";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { AsyncHandler } from "../middlewares/error.js"; 
import ErrorHandler from "../utils/utility-class.js"; 
import "dotenv/config";
import { Product } from "../models/product.models.js";
import { Order } from "../models/order.models.js";


const itemLookupTool = tool(
  async (input: { query: string }) => {
    try {
      const { query } = input;
      const items = await Product.find({
        $or: [
          { ProductName: { $regex: query, $options: 'i' } },
          { category: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } }
        ]
      }).limit(4).lean();
      return items.length > 0 ? JSON.stringify(items) : "No products found.";
    } catch (error: any) {
      return `Error: ${error.message}`;
    }
  },
  {
    name: "item_lookup",
    description: "Search for products across categories like Mobiles, Laptops, Fashion, Grocery, Fitness, etc.",
  }
);

const orderLookupTool = tool(
  async (input: { raw: string }) => {
    try {
      const parsed = JSON.parse(input.raw);
      const user = parsed.userId;

      console.log("Order Tool Input userId:", user);

      const orders = await Order.find({ user }).sort({ createdAt: -1 }).limit(3).lean();
      if (orders.length === 0) return "No recent orders found.";

      const formatted = orders.map(o => ({
        id: o._id,
        item: o.orderItems[0]?.ProductName,
        status: o.status
      }));

      return JSON.stringify(formatted);
    } catch (error: any) {
      return `Error: ${error.message}`;
    }
  },
  {
    name: "order_lookup",
    description: "Fetch recent orders for a user ID. Input should be a JSON string containing { userId: string }.",
  }
);


const tools = [itemLookupTool, orderLookupTool];
const toolNode = new ToolNode(tools);


const GraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
});

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  temperature: 0.3,
  apiKey: process.env.GOOGLE_API_KEY,
}).bindTools(tools);

async function callModel(state: typeof GraphState.State) {
  const instructions = `You are a smart e-commerce assistant.
Categories: Electronics, Mobiles, Laptops, Fashion, Beauty, Toys, Appliances, Furniture, Home Decor, Books, Grocery, Fitness.
Use 'item_lookup' for products and 'order_lookup' for orders.
Answer in a friendly tone.`;

  const messages = [
    new HumanMessage(instructions),
    ...state.messages
  ];

  const response = await model.invoke(messages);
  return { messages: [response] };
}

const workflow = new StateGraph(GraphState)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addEdge("__start__", "agent")
  .addConditionalEdges("agent", (state) => {
    const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
    return lastMessage.tool_calls?.length ? "tools" : "__end__";
  })
  .addEdge("tools", "agent");

const app = workflow.compile();


export const getChatbotResponse = AsyncHandler(async (req, res, next) => {
  const { message } = req.body;
  const { id: userId } = req.query;

  if (!message) {
    return next(new ErrorHandler("Please provide a message", 400));
  }

  try {
    // Yaha hum userId ko message ke saath HumanMessage me bhej rahe hain
    // Tool ke andar input.raw me ye JSON parse hoke use hoga
    const userMessage = new HumanMessage(JSON.stringify({
      userId: userId || "Guest",
      text: message
    }));

    const result = await app.invoke({
      messages: [userMessage]
    });

    const finalReply = result.messages[result.messages.length - 1].content;

    return res.status(200).json({
      success: true,
      reply: finalReply,
    });

  } catch (error: any) {
    return next(new ErrorHandler(error.message || "Chatbot Error", 500));
  }
});

