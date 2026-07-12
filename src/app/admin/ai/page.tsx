"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Brain, Check, Loader2 } from "lucide-react";

interface AIConfigData {
  id?: string;
  baseURL: string;
  apiKey: string;
  modelName: string;
  temperature: number;
  maxTokens: number;
  isActive: boolean;
}

export default function AdminAIPage() {
  const [config, setConfig] = useState<AIConfigData>({
    baseURL: "https://api.openai.com/v1",
    apiKey: "",
    modelName: "gpt-4o",
    temperature: 0.8,
    maxTokens: 2000,
    isActive: false,
  });
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<string>("");
  const [testLoading, setTestLoading] = useState(false);

  // 加载现有配置
  useEffect(() => {
    fetch("/api/admin/ai-config")
      .then((res) => res.json())
      .then((data) => {
        if (data.config) {
          setConfig({
            ...data.config,
            apiKey: "", // 安全考虑：不返回完整 apiKey
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ai-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        alert("配置保存成功");
      } else {
        alert("保存失败");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setTestLoading(true);
    setTestResult("");
    try {
      const res = await fetch("/api/admin/ai-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult(`✅ 连接成功！耗时 ${data.duration}ms\nAI 响应: ${data.content}`);
      } else {
        setTestResult(`❌ 连接失败: ${data.error}`);
      }
    } catch (e) {
      setTestResult("❌ 网络错误");
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">AI 配置</h1>

      <Card className="p-6 bg-slate-900/80 border-slate-700/50 max-w-2xl">
        <div className="space-y-4">
          <div>
            <Label className="text-slate-300">API 地址</Label>
            <Input
              value={config.baseURL}
              onChange={(e) => setConfig({ ...config, baseURL: e.target.value })}
              className="mt-1 bg-slate-800 border-slate-600 text-white"
              placeholder="https://api.openai.com/v1"
            />
          </div>

          <div>
            <Label className="text-slate-300">API Key</Label>
            <Input
              type="password"
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              className="mt-1 bg-slate-800 border-slate-600 text-white"
              placeholder="sk-..."
            />
          </div>

          <div>
            <Label className="text-slate-300">模型名称</Label>
            <Input
              value={config.modelName}
              onChange={(e) => setConfig({ ...config, modelName: e.target.value })}
              className="mt-1 bg-slate-800 border-slate-600 text-white"
              placeholder="gpt-4o / deepseek-chat / qwen-max"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">温度 (0-2)</Label>
              <Input
                type="number"
                min={0}
                max={2}
                step={0.1}
                value={config.temperature}
                onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                className="mt-1 bg-slate-800 border-slate-600 text-white"
              />
            </div>

            <div>
              <Label className="text-slate-300">最大 Token</Label>
              <Input
                type="number"
                min={100}
                max={8000}
                value={config.maxTokens}
                onChange={(e) => setConfig({ ...config, maxTokens: parseInt(e.target.value) })}
                className="mt-1 bg-slate-800 border-slate-600 text-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.isActive}
              onChange={(e) => setConfig({ ...config, isActive: e.target.checked })}
              className="accent-purple-600"
            />
            <Label className="text-slate-300">设为活跃配置</Label>
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} disabled={loading} className="bg-purple-600">
              {loading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              保存配置
            </Button>
            <Button onClick={handleTest} disabled={testLoading} variant="outline"
              className="border-slate-600 text-slate-300">
              {testLoading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              测试连接
            </Button>
          </div>

          {testResult && (
            <div className="p-3 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-300 whitespace-pre-wrap">
              {testResult}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
