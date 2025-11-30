"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function CTA() {
    return (
        <section className="py-32 px-4 bg-brand-void relative overflow-hidden">
            <div className="absolute inset-0 bg-brand-lime/5 blur-[100px] pointer-events-none" />

            <div className="max-w-4xl mx-auto text-center relative z-10">
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-4xl md:text-6xl font-display font-bold text-white mb-8"
                >
                    Pronto para Escalar <br />
                    <span className="text-brand-lime">Sem Contratar?</span>
                </motion.h2>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="text-xl text-brand-text/60 mb-12 max-w-2xl mx-auto"
                >
                    Configure sua primeira campanha automatizada hoje. Teste grátis por 7 dias.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4"
                >
                    <button className="px-10 py-5 rounded-full bg-brand-lime text-brand-void font-bold text-xl hover:scale-105 transition-transform flex items-center gap-2">
                        Começar Teste Grátis
                        <ArrowRight className="w-6 h-6" />
                    </button>
                    <button className="px-10 py-5 rounded-full border border-white/10 text-white font-medium hover:bg-white/5 transition-colors">
                        Falar com Especialista
                    </button>
                </motion.div>
            </div>
        </section>
    );
}
