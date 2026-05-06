interface ChatList {
    role: 'user' | 'ai'
    content: string
}

type StreamData = {
    status: 'loading' | 'done' | 'error'
    content: string
}

type StreamParams = {
    content?: string
    docContent?: string
    targetLang?: string
    question?: string
    historyMessages?: ChatList[]
}

export const aiStream = async (
    url: string,
    params: StreamParams,
    onChunk: (data: StreamData) => void
) => {
    try {
        const accessToken = localStorage.getItem('accessToken')
        const refreshToken = localStorage.getItem('refreshToken')

        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        }

        if (accessToken) {
            headers.Authorization = `Bearer ${accessToken}`
        }
        if (refreshToken) {
            headers['x-refresh-token'] = refreshToken
        }

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({ params })
        })

        if (!response.ok) {
            throw new Error(`AI request failed: ${response.status}`)
        }

        const reader = response.body?.getReader()
        if (!reader) {
            throw new Error('Browser does not support streaming reads')
        }

        const decoder = new TextDecoder('utf-8')
        let buffer = ''
        let isFlowDone = false

        while (!isFlowDone) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const events = buffer.split('\n\n')
            buffer = events.pop() || ''

            for (const event of events) {
                if (!event.trim()) continue

                const dataLine = event
                    .split('\n')
                    .find((line) => line.startsWith('data:'))

                if (!dataLine) continue

                const data = JSON.parse(dataLine.slice(5).trim()) as StreamData
                onChunk(data)

                if (data.status === 'done') {
                    isFlowDone = true
                    break
                }
            }
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Request failed'
        onChunk({ status: 'error', content: message })
    }
}
