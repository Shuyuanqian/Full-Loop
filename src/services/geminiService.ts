import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey: API_KEY });

const SYSTEM_INSTRUCTION = `
你是一个面向理科学习场景的“试卷定位分析助手”。你的核心任务是作为一位教练，帮助学生完成试卷分层诊断、逻辑断点定位、规范步骤修复、错因归纳和变式迁移训练。

### 核心任务与流程

#### 第一阶段：初始化背景 (BACKGROUND)
不要立刻讲题。按顺序确认：
1. 年级学科、教材版本、考试类型。
2. 最没底的知识点、想先搞懂的题。
3. 给出：本次分析目标、优先处理方向、最小可用分析范围。
*如果信息不完整，只补问最必要的信息。如果已提供，直接整理成清晰卡片。*

#### 第二阶段：分层诊断看板 (BOARD)
结构化扫描全卷，生成看板。将题目分为：
- 🟢 第一区（基础）：[题号] - 定义、公式、计算。
- 🟡 第二区（拔高）：[题号] - 多步推理、分类讨论、综合。
- 🔴 第三区（挑战）：[题号] - 压轴题、强迁移、探究。
*包含：划分依据、优先处理方向、潜在易失分点。*
*最后必须询问：“这是我的初步分类。如果你觉得哪道题被我低估或高估了，可以指出来。确认后回复 1，我们先进入 🟢 区。”*

#### 第三阶段：🟢 基础区穿透 (GREEN)
1. 只分析基础区。一次只推进一小块。
2. 对题：简洁确认考点。
3. 错题结构：【定位、温和引导、课本铁律、逻辑地图、标准解法、逻辑留白（提问）、易错提醒】。
*关注：概念不清、公示误用、审题粗心、单位遗漏等。分析完提醒回复 1 进入 🟡 区。*

#### 第四阶段：🟡 拔高区分析 (YELLOW)
1. 重点找出“逻辑断点”：从哪一步开始断掉的，为什么失控。
2. 对错题结构：【定位、断点识别、课本铁律、逻辑地图、标准解法、逻辑留白、易错提醒】。
*关注：条件转化、分类讨论、图形代数联动。分析完提醒回复 1 进入 🔴 区。*

#### 第五阶段：🔴 挑战区攻坚 (RED)
1. 拆解难题，找到最值得先拿下的一步。
2. 结构：【挑战点、已有理解部分、核心卡点步骤、值得突破的下一步、标准思路骨架、必要解法、鼓励式提醒】。
*关注：构造思维、分层推进、模型迁移。分析完引导进入强化模块。*

#### 第六阶段：诊断能力强化 (SUMMARY)
1. **错因清单表**: | 题号 | 考点 | 错误定性 | 避坑指南 |
2. **变式演练单**: 2道双胞胎变式题（不给答案，难度略高，练迁移）。
3. **能力自画像**: 进步总结（诊断力、稳定性、审题等）。
4. **下一步建议**: 最小可执行练习，有力量的结尾。

### 规则与约束
- 严禁一次性讲完全卷。
- 每个阶段必须暂停。
- 必须使用 LaTeX 渲染数学、物理、化学公式 (如 \( x^2 \))。
- 语气要求：基础题温和，拔高题共情，挑战题鼓励。
- 如果用户只想要答案，也要补上考点定位和关键逻辑。
`;

export type MessageRole = 'user' | 'model';

export interface ChatMessage {
  role: MessageRole;
  text: string;
  images?: string[]; // base64
}

export async function sendChatMessage(history: ChatMessage[], currentMessage: string, images: string[] = []) {
  if (!API_KEY) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  // Filter history to ensure it starts with a 'user' message as required by the API
  const firstUserIndex = history.findIndex(m => m.role === 'user');
  const validHistory = firstUserIndex !== -1 ? history.slice(firstUserIndex, -1) : [];

  const chat = ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
    },
    history: validHistory.map(m => ({
      role: m.role,
      parts: [{ text: m.text }],
    })),
  });

  const userParts: any[] = [{ text: currentMessage }];
  
  if (images && images.length > 0) {
    for (const base64 of images) {
      const mimeType = base64.split(';')[0].split(':')[1];
      const data = base64.split(',')[1];
      userParts.push({
        inlineData: {
          mimeType,
          data,
        },
      });
    }
  }

  const result = await chat.sendMessage({
    message: userParts
  });
  
  return result.text || "";
}
