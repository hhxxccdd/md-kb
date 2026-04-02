/**
 * 通用 SSE 流式请求工具（基于你的代码封装） 对代码进行解构，否则无法实现高的扩展性
 * @param url 后端接口地址
 * @param params 请求参数 { content, context? }
 * @param onChunk 流式回调：接收每一段数据
 */

interface chatList {
     role:'user'|'ai'
     content:string
}

export const aiStream = async (url: string,
    params: { content?: string; docContent?: string; targetLang?: string; question?: string,historyMessages?:chatList[] },
    onChunk: (data: { status: 'loading' | 'done' | 'error'; content: string }) => void  //回调函数
) => {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ params }) //通用参数
        })

        if (!response.ok) throw new Error('请求失败')

        const reader = response.body?.getReader()
        if (!reader) throw new Error('浏览器不支持流式读取')

        const decoder = new TextDecoder('utf-8')
        let buffer = ''
        let isFlowDone = false

        while (true) {
            if (isFlowDone) break
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            buffer += chunk
            const events = chunk.split('\n\n')
            buffer = events.pop() || ''

            //处理每一段传过来的SSE事件
            for (const event of events) {
                if (!event.trim()) continue
                const lines = event.split('\n')
                let dataJsonStr = ''

                for (const line of lines) {
                    if (line.startsWith('data:')) {
                        dataJsonStr = line.slice(5).trim()
                        break
                    }
                }

                if (!dataJsonStr) continue
                const data = JSON.parse(dataJsonStr)


                //执行回调，将数据抛给组件
                onChunk(data)

                if (data.status === 'done') {
                    isFlowDone = true
                    break
                }
            }
        }
    } catch (err) {

        onChunk({ status: 'error', content: '请求失败，请重试' })

    }

}