import { Router } from "express";
import { handleAIStream } from "./service";
import aiRateLimiter from "../../middleware/rateLimit";

const aiRouter = Router()


// 1. Ai润色
aiRouter.post('/polish', aiRateLimiter,(req,res) => handleAIStream(req,res,"polish"))

// 2. AI翻译
aiRouter.post("/translate", aiRateLimiter, (req, res) => handleAIStream(req, res, "translate"));

// 3. 生成目录
aiRouter.post("/generate-toc",  aiRateLimiter,(req, res) => handleAIStream(req, res, "generateToc"));

// 4. 代码优化
aiRouter.post("/optimize-code",  aiRateLimiter,(req, res) => handleAIStream(req, res, "optimizeCode"));

// 5. 文档问答
aiRouter.post("/answer-doc",  aiRateLimiter,(req, res) => handleAIStream(req, res, "answerDoc"));


export default aiRouter