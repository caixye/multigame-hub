"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

interface ChatMessage {
  userId: string;
  username: string;
  content: string;
  timestamp: string;
}

interface ChatBoxProps {
  messages: ChatMessage[];
  onSend: (content: string) => void;
  disabled?: boolean;
  isDead?: boolean;
  currentUserId?: string;
  quickMessages?: string[];
}

export function ChatBox({
  messages,
  onSend,
  disabled = false,
  isDead = false,
  currentUserId,
  quickMessages,
}: ChatBoxProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/50 rounded-lg border border-slate-700/50">
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`text-sm ${isDead ? "opacity-50" : ""}`}
          >
            {msg.content.startsWith("[系统]") ? (
              <p className="text-yellow-400 text-center">{msg.content}</p>
            ) : (
              <div className="flex gap-2 items-baseline">
                <span className="text-xs text-slate-400 font-medium shrink-0">
                  {msg.username}
                </span>
                <span className="text-white/90 break-words">{msg.content}</span>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 快捷发言 */}
      {quickMessages && quickMessages.length > 0 && (
        <div className="px-3 py-1 border-t border-slate-700/30">
          <div className="flex flex-wrap gap-1">
            {quickMessages.map((msg) => (
              <button
                key={msg}
                onClick={() => onSend(msg)}
                disabled={disabled}
                className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50"
              >
                {msg}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 输入框 */}
      <div className="p-3 border-t border-slate-700/50">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isDead ? "你已成为幽灵..." : disabled ? "等待中..." : "输入消息..."}
            disabled={disabled}
            className="flex-1 bg-slate-800 border-slate-600 text-white text-sm"
          />
          <Button
            onClick={handleSend}
            disabled={disabled || !input.trim()}
            size="icon"
            variant="ghost"
            className="text-slate-400 hover:text-white"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
