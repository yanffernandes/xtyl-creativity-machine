"use client";

import { motion } from "framer-motion";
import { XCircle, AlertTriangle, Puzzle } from "lucide-react";

const problems = [
    {
        title: "O Custo da Refação",
        description:
            "Cliente aprova o briefing, mas reprova o criativo. 3 rodadas de alteração depois, seu lucro virou prejuízo.",
        icon: XCircle,
    },
    {
        title: "O Gargalo Humano",
        description:
            "Mais demanda exige mais contratações. Sua folha de pagamento cresce na mesma velocidade da receita.",
        icon: AlertTriangle,
    },
    {
        title: "A Torre de Babel",
        description:
            "Briefing no Word, Texto no ChatGPT, Imagem no Midjourney. Ferramentas desconectadas geram erros de contexto.",
        icon: Puzzle,
    },
];

export function Problem() {
    return (
        <section className="py-24 px-4 bg-brand-void relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-6xl mx-auto relative z-10">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-6">
                        Sua Agência Está Crescendo, <br />
                        <span className="text-red-500">Mas o Lucro Está Derretendo?</span>
                    </h2>
                    <p className="text-brand-text/60 max-w-2xl mx-auto text-lg">
                        O "Caos Criativo" é o inimigo silencioso da escala.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {problems.map((problem, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-red-500/30 transition-colors group"
                        >
                            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-6 group-hover:bg-red-500 group-hover:text-white transition-colors text-red-500">
                                <problem.icon className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">
                                {problem.title}
                            </h3>
                            <p className="text-brand-text/60 leading-relaxed">
                                {problem.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
