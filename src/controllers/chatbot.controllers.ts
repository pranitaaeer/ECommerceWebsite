import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { StateGraph, Annotation } from "@langchain/langgraph";
import { AsyncHandler } from "../middlewares/error.js";
import ErrorHandler from "../utils/utility-class.js";
import "dotenv/config";
import { Order } from "../models/order.models.js";
import { Product } from "../models/product.models.js";
import { ChatGroq } from "@langchain/groq";
import { Request, Response, NextFunction } from "express";

interface OrderSummary {
  item: string;
  status: string;
  total: number;
  date: string;
}

interface ProductSummary {
  name: string;
  category: string;
  price: number;
  description: string;
}

const GraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  ordersJSON: Annotation<OrderSummary[]>({
    reducer: (_, y) => y,
    default: () => [],
  }),
  productsJSON: Annotation<ProductSummary[]>({
    reducer: (_, y) => y,
    default: () => [],
  }),
});

const model = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "llama-3.3-70b-versatile",
  temperature: 0,
});

async function callModel(state: typeof GraphState.State) {
  const systemMsg = state.messages.find(
    (m) => m instanceof SystemMessage
  ) as SystemMessage;

  const uid =
    systemMsg?.content?.toString().replace("USER_ID:", "").trim() || "Guest";

  const userMessage = state.messages
    .filter((msg) => msg instanceof HumanMessage)
    .map((m) => m.content)
    .join("\n");

  // Orders and Products JSON
  const ordersJSON = state.ordersJSON || [];
  const productsJSON = state.productsJSON || [];

  const instructions = `
You are a professional e-commerce assistant.

Orders data (IDs hidden for privacy):
${JSON.stringify(ordersJSON, null, 2)}

Products data:
${JSON.stringify(productsJSON, null, 2)}

User ID: "${uid}"  // system only, do NOT show to user

RULES:
- Answer user's question strictly based on the above orders/products data.
- Never display sensitive info (like order IDs or user ID).
- Format answer naturally for chat.
- Include relevant fields:
  - Orders: item name, status, total, order date
  - Products: name, category, price, short description
- If user asks about a specific item, show only relevant info.
- If no matching orders/products, reply accordingly.
- Use friendly, professional tone.
`;

  const response = await model.invoke([
    new SystemMessage(instructions),
    new HumanMessage(userMessage),
  ]);

  return { messages: [response] };
}

const workflow = new StateGraph(GraphState)
  .addNode("agent", callModel)
  .addEdge("__start__", "agent");

const app = workflow.compile();

export const getChatbotResponse = AsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { message } = req.body;
    const { id: userId } = req.query;

    if (!message) return next(new ErrorHandler("Message is required", 400));

    try {
      const uid = typeof userId === "string" ? userId : "Guest";

      // Fetch Orders
      let ordersJSON: OrderSummary[] = [];
      if (uid !== "Guest") {
        const orders = await Order.find({ user: uid })
          .sort({ createdAt: -1 })
          .limit(5)
          .lean();

        ordersJSON = orders.map((o) => ({
          item: o.orderItems?.[0]?.ProductName || "Item",
          status: o.status || "Unknown",
          total: o.total || 0,
          date: new Date(o.createdAt).toLocaleDateString(),
        }));
      }

      // Fetch Products (basic example: top 10 products)
      const products = await Product.find({})
        .limit(10)
        .lean();

      const productsJSON: ProductSummary[] = products.map((p) => ({
        name: p.ProductName || "Product",
        category: p.category || "General",
        price: p.price || 0,
        description: p.description
          ? p.description.slice(0, 60) + "..."
          : "No description available.",
      }));

      const result = await app.invoke(
        {
          messages: [
            new SystemMessage(`USER_ID: ${uid}`),
            new HumanMessage(message),
          ],
          ordersJSON,
          productsJSON,
        },
        { recursionLimit: 25 }
      );

      let finalReply = "";
      for (let i = result.messages.length - 1; i >= 0; i--) {
        const msg = result.messages[i];
        if (msg.content && typeof msg.content === "string" && msg.content.trim()) {
          finalReply = msg.content;
          break;
        }
      }


      const isAskingOrders = /order|status|track/i.test(message);
      const isAskingProducts = /product|show|buy|item|price/i.test(message);

      return res.status(200).json({
        success: true,
        reply: finalReply || "I am not sure how to answer that.",
        orders: isAskingOrders ? ordersJSON : [], 
        products: isAskingProducts ? productsJSON : []
      });
    } catch (err: any) {
      console.error(err);
      return next(new ErrorHandler(err.message, 500));
    }
  }
);