import { Request, Response } from "express";
import { throwBusinessError } from "../../middleware/errorMiddleware";
import { AIPromptTemplates, escapePromptContent } from "./prompt";
import { initSSE, SSEStatus } from "./sse";
import { ChatParams } from "./type";
import { AI_CONFIG } from "./config";
import { requestAI } from "./client";


//定义支持的模板类型
export type PromptTemplateType = keyof typeof AIPromptTemplates


// 封装AI通用流式请求方法
// @param req Express请求对象
// @param res Express响应对象
// @param remplateType 模板类型:polish/translate/generateToc/optimizeCode/answerDoc
export async function handleAIStream(req: Request, res: Response, templateType: PromptTemplateType) {
    try {
        const params = req.body.params
        if (!params || typeof params !== 'object') {
            throwBusinessError('请传入模板参数params')
        }

        //根据模板类型生成提示词
        let prompt = ""

        switch (templateType) {
            case "polish":
                const polishTemplate = AIPromptTemplates[templateType] as typeof AIPromptTemplates["polish"]
                prompt = polishTemplate(escapePromptContent(params.content))
                break;
            case "translate":
                const translateTemplate = AIPromptTemplates[templateType] as typeof AIPromptTemplates["translate"]
                prompt = translateTemplate(escapePromptContent(params.content), escapePromptContent(params.targetLang))
                break;
            case "answerDoc":
                const answerDocTemplate = AIPromptTemplates[templateType] as typeof AIPromptTemplates["answerDoc"]
                prompt = answerDocTemplate(escapePromptContent(params.docContent), escapePromptContent(params.question));
                break;
            default:
                throwBusinessError("不支持的模板类型");
        }

        //初始化SSE
        const { send, close } = initSSE(req, res)

        //构建AI请求参数
        const chatParams: ChatParams = {
            model: AI_CONFIG.MODEL,
            input: { messages: [{ role: 'user', content: prompt }] },
            parameters: { stream: true },
            incremental_output: true
        }

        //发送请求
        const stream = await requestAI(chatParams)

        let buffer = ""
        let lastText = ""

        //监听流式数据（通用流式解析）
        stream.on('data', (chunk: Buffer) => {
            buffer += chunk.toString('utf8');
            const events = buffer.split('\n\n'); // 用\n\n分割
            buffer = events.pop() || '';

            for (const event of events) {
                if (!event.trim()) continue;
                const dataLine = event.split('\n').find(line => line.startsWith('data:'));
                if (!dataLine) continue;

                try {
                    const jsonStr = dataLine.replace(/^data:\s*/, '').trim();
                    const data = JSON.parse(jsonStr);
                    const fullText = data.output?.text || '';
                    const incrementalContent = fullText.slice(lastText.length);
                    lastText = fullText;

                    if (incrementalContent) {
                        send({ content: incrementalContent }); // ✅ 能执行到这里
                    }

                    if (data.output?.finish_reason === "stop") {
                        setTimeout(() => {
                            send({ status: SSEStatus.DONE });
                            close();
                        }, 100);
                    }
                } catch (e) {
                    continue;
                }
            }
        });
        //流异常/结束
        stream.on("error", (err: any) => {
            send({ status: SSEStatus.ERROR, content: err.message });
            close();
        });
        stream.on("end", () => {
            close();
        });

    } catch (error: any) {
        if (!res.writableEnded) {
            res.write(`data: ${JSON.stringify({ status: SSEStatus.ERROR, content: error.message })}\n\n`);
            res.end();
        }
    }
}
