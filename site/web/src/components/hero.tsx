"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Demo } from "@/components/demo";

export function Hero() {
    return (
        <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4 pt-20 pb-32">
            {/* Background Effects */}
            <div className="absolute inset-0 w-full h-full bg-brand-void">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-brand-lime/20 opacity-20 blur-[100px]"></div>
            </div>

            <div className="relative z-10 max-w-5xl mx-auto text-center space-y-8">
                {/* Eyebrow */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm"
                >
                    <Sparkles className="w-4 h-4 text-brand-lime" />
                    <span className="text-sm font-medium text-brand-text/80">
                        Para Agências que Precisam Escalar
                    </span>
                </motion.div>

                {/* Headline */}
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="text-5xl md:text-7xl font-display font-bold tracking-tight text-white leading-[1.1]"
                >
                    Transforme Briefing em <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-lime to-brand-violet">
                        Campanha Completa
                    </span>
                </motion.h1>

                {/* Subheadline */}
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="text-lg md:text-xl text-brand-text/60 max-w-2xl mx-auto leading-relaxed"
                >
                    Xynapse é o sistema operacional de criatividade que sua agência estava
                    esperando. Centralize brandbooks, automatize workflows e produza em
                    escala.
                </motion.p>

                {/* CTAs */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4"
                >
                    <button className="group relative px-8 py-4 rounded-full bg-brand-lime text-brand-void font-bold text-lg transition-transform hover:scale-105 active:scale-95">
                        <span className="relative z-10 flex items-center gap-2">
                            Começar Teste Grátis
                            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                        </span>
                        <div className="absolute inset-0 rounded-full bg-white/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>

                    <button className="px-8 py-4 rounded-full border border-white/10 text-white font-medium hover:bg-white/5 transition-colors">
                        Agendar Demo
                    </button>
                </motion.div>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    className="text-sm text-brand-text/40"
                >
                    Sem cartão de crédito • Setup em 10 minutos
                </motion.p>
            </div>

            {/* Visual Demo */}
            <div className="w-full mt-10">
                <Demo />
            </div>
        </section>
    );
}
