"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import { clsx } from "clsx";

const faqs = [
    {
        question: "O que são 'Créditos de Geração'?",
        answer:
            "1 crédito equivale a 1 imagem gerada OU aproximadamente 500 palavras de texto. O Plano Pro Agency (3.000 créditos) permite gerar cerca de 3.000 imagens ou 600 artigos de blog por mês.",
    },
    {
        question: "Preciso saber programar?",
        answer:
            "Não. Toda a interface é visual. Você cria workflows arrastando blocos e conecta as etapas de forma intuitiva.",
    },
    {
        question: "Funciona em português?",
        answer:
            "Sim. A interface e a geração de conteúdo são nativas em PT-BR, mas o sistema também suporta inglês e espanhol.",
    },
    {
        question: "Posso cancelar quando quiser?",
        answer:
            "Sim. Não há contratos de fidelidade. Você pode cancelar sua assinatura a qualquer momento com um clique.",
    },
];

export function FAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <section className="py-24 px-4 bg-brand-void">
            <div className="max-w-3xl mx-auto">
                <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-12 text-center">
                    Perguntas Frequentes
                </h2>

                <div className="space-y-4">
                    {faqs.map((faq, i) => (
                        <div
                            key={i}
                            className="border border-white/10 rounded-2xl bg-white/5 overflow-hidden"
                        >
                            <button
                                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                                className="w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition-colors"
                            >
                                <span className="text-lg font-medium text-white">
                                    {faq.question}
                                </span>
                                <span className="ml-4 shrink-0 text-brand-lime">
                                    {openIndex === i ? (
                                        <Minus className="w-5 h-5" />
                                    ) : (
                                        <Plus className="w-5 h-5" />
                                    )}
                                </span>
                            </button>

                            <AnimatePresence>
                                {openIndex === i && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <div className="p-6 pt-0 text-brand-text/70 leading-relaxed">
                                            {faq.answer}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
