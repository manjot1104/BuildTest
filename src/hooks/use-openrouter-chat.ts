import { useState } from "react"

export function useOpenRouterChat() {
  const [messages, setMessages] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = async (content: string) => {
    setIsLoading(true)

    const res = await fetch("/api/openrouter/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          ...messages,
          { role: "user", content },
        ],
      }),
    })

    const reader = res.body?.getReader()
    const decoder = new TextDecoder()

    let fullText = ""

    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        fullText += chunk
      }
    }

    setMessages(prev => [
      ...prev,
      { role: "user", content },
      { role: "assistant", content: fullText },
    ])

    setIsLoading(false)
  }

  return {
    messages,
    sendMessage,
    isLoading,
  }
}