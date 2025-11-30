"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

const comparisonData = [
    {
        feature: "Tempo de Onboarding",
        oldWay: "2-3 dias (explicar tom de voz)",
        newWay: "10 minutos (upload de PDFs)",
    },
    {
        feature: "Geração de 50 Ads",
        oldWay: "8 horas (design + copy)",
        newWay: "45 minutos (revisão)",
    },
    {
        feature: "Consistência de Marca",
        oldWay: "Depende do humor do criativo",
        newWay: "95% garantida pelo Brand Memory",
    },
    {
        feature: "Custo de Ferramentas",
        oldWay: "R$ 300+ (GPT + Midjourney + Canva)",
        newWay: "R$ 497 (Tudo em um)",
    },
    {
        feature: "Controle & Auditoria",
        oldWay: "Zero (contas pessoais)",
        newWay: "Total (Workspace centralizado)",
    },
];

export function Comparison() {
    return (
        <section className="py-24 px-4 bg-brand-void">
            <div className="max-w-5xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-6">
                        Xynapse vs. O Jeito Antigo
                    </h2>
                </div>

                <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
                    <div className="grid grid-cols-3 p-6 border-b border-white/10 bg-white/5 font-display font-bold text-lg md:text-xl">
                        <div className="text-brand-text/40">Aspecto</div>
                        <div className="text-red-400">Sem Xynapse</div>
                        <div className="text-brand-lime">Com Xynapse</div>
                    </div>

                    {comparisonData.map((row, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="grid grid-cols-3 p-6 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors items-center"
                        >
                            <div className="font-medium text-white">{row.feature}</div>
                            <div className="text-brand-text/60 flex items-center gap-2">
                                <X className="w-4 h-4 text-red-500 shrink-0 hidden md:block" />
                                <span className="text-sm md:text-base">{row.oldWay}</span>
                            </div>
                            <div className="text-white flex items-center gap-2 font-medium">
                                <Check className="w-4 h-4 text-brand-lime shrink-0 hidden md:block" />
                                <span className="text-sm md:text-base">{row.newWay}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
