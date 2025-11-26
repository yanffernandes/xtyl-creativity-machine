"use client";

import React, { useState, useEffect } from 'react';
import { Check, ChevronDown, Info, Sparkles, Zap, DollarSign } from 'lucide-react';
import api from '@/lib/api';

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  max_tokens: number;
  context_window: number;
  supports_streaming: boolean;
  supports_json_mode: boolean;
  supports_vision: boolean;
  description: string;
  recommended_for: string[];
  pricing: {
    input: number;
    output: number;
  };
}

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
  taskType: 'text' | 'image';
  disabled?: boolean;
  className?: string;
}

export function ModelSelector({
  value,
  onChange,
  taskType,
  disabled = false,
  className = ''
}: ModelSelectorProps) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<ModelInfo | null>(null);

  useEffect(() => {
    loadModels();
  }, [taskType]);

  useEffect(() => {
    if (models.length > 0) {
      const model = models.find(m => m.id === value);
      setSelectedModel(model || models[0]);
    }
  }, [value, models]);

  const loadModels = async () => {
    try {
      setLoading(true);
      const endpoint = taskType === 'text' ? '/models/text' : '/models/image';
      const response = await api.get(endpoint);
      setModels(response.data);
    } catch (error) {
      console.error('Failed to load models:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (modelId: string) => {
    onChange(modelId);
    setIsOpen(false);
  };

  const getProviderColor = (provider: string) => {
    const colors: Record<string, string> = {
      openai: 'text-green-600 dark:text-green-400',
      anthropic: 'text-orange-600 dark:text-orange-400',
      stabilityai: 'text-purple-600 dark:text-purple-400'
    };
    return colors[provider] || 'text-gray-600 dark:text-gray-400';
  };

  const getCapabilityIcon = (model: ModelInfo) => {
    if (model.supports_vision) return <Sparkles className="w-4 h-4" />;
    if (model.supports_streaming) return <Zap className="w-4 h-4" />;
    return null;
  };

  if (loading) {
    return (
      <div className="w-full h-12 rounded-lg bg-white/40 dark:bg-white/5 backdrop-blur-xl animate-pulse" />
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Selector Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full px-4 py-3 rounded-lg bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {selectedModel && getCapabilityIcon(selectedModel)}
            <div className="flex flex-col items-start min-w-0 flex-1">
              <span className="font-medium text-gray-900 dark:text-white truncate w-full text-left">
                {selectedModel?.name || 'Select model'}
              </span>
              {selectedModel && (
                <span className={`text-xs ${getProviderColor(selectedModel.provider)}`}>
                  {selectedModel.provider}
                </span>
              )}
            </div>
          </div>
          <ChevronDown
            className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Options */}
          <div className="absolute z-20 w-full mt-2 py-2 rounded-xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-2xl max-h-96 overflow-y-auto">
            {models.map((model) => (
              <button
                key={model.id}
                type="button"
                onClick={() => handleSelect(model.id)}
                className="w-full px-4 py-3 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 transition-colors text-left group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="mt-1">
                      {getCapabilityIcon(model)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {model.name}
                        </span>
                        <span className={`text-xs ${getProviderColor(model.provider)}`}>
                          {model.provider}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                        {model.description}
                      </p>

                      {/* Capabilities */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {model.supports_streaming && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                            <Zap className="w-3 h-3" />
                            Streaming
                          </span>
                        )}
                        {model.supports_json_mode && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                            JSON
                          </span>
                        )}
                        {model.supports_vision && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                            <Sparkles className="w-3 h-3" />
                            Vision
                          </span>
                        )}
                      </div>

                      {/* Pricing */}
                      {taskType === 'text' && (
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            ${model.pricing.input.toFixed(4)}/1K in
                          </span>
                          <span>
                            ${model.pricing.output.toFixed(4)}/1K out
                          </span>
                        </div>
                      )}

                      {/* Recommended For */}
                      {model.recommended_for.length > 0 && (
                        <div className="mt-2 flex items-start gap-1">
                          <Info className="w-3 h-3 mt-0.5 text-gray-400" />
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Best for: {model.recommended_for.slice(0, 2).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Selected Check */}
                  {value === model.id && (
                    <Check className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Compact version for inline use in forms
 */
export function ModelSelectorCompact({
  value,
  onChange,
  taskType,
  disabled = false,
  className = ''
}: ModelSelectorProps) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadModels();
  }, [taskType]);

  const loadModels = async () => {
    try {
      setLoading(true);
      const endpoint = taskType === 'text' ? '/models/text' : '/models/image';
      const response = await api.get(endpoint);
      setModels(response.data);
    } catch (error) {
      console.error('Failed to load models:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <select className="w-full px-3 py-2 rounded-lg bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10" disabled>
        <option>Loading...</option>
      </select>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`w-full px-3 py-2 rounded-lg bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {models.map((model) => (
        <option key={model.id} value={model.id}>
          {model.name} ({model.provider})
        </option>
      ))}
    </select>
  );
}
