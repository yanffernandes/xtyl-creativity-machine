"use client";

import { motion } from "framer-motion";
import { Brain, Workflow, Image as ImageIcon, Layers } from "lucide-react";
import { clsx } from "clsx";

const features = [
    {
        title: "Brand Memory™",
        description:
            "A IA que não esquece. Faça upload de brandbooks e garanta consistência total de tom de voz.",
        icon: Brain,
        className: "md:col-span-2",
        bg: "bg-gradient-to-br from-brand-violet/20 to-brand-void",
    },
    {
        title: "Workflows Autônomos",
        description:
            "Crie fluxos que rodam sozinhos: Pesquisa -> Texto -> Imagem -> Aprovação.",
        icon: Workflow,
        className: "md:col-span-1",
        bg: "bg-white/5",
    },
    {
        title: "Geração Multimodal",
        description:
            "Texto e Imagem sincronizados. O prompt de um influencia o contexto do outro.",
        icon: ImageIcon,
        className: "md:col-span-1",
        bg: "bg-white/5",
    },
    {
        title: "Hierarquia de Projetos",
        description:
            "Isolamento total entre clientes. O que acontece no Projeto A, fica no Projeto A.",
        icon: Layers,
        className: "md:col-span-2",
        bg: "bg-gradient-to-br from-brand-lime/10 to-brand-void",
    },
];

export function Features() {
    return (
        <section className="py-24 px-4 bg-brand-void relative z-10">
            <div className="max-w-6xl mx-auto">
                <div className="mb-16 text-center">
                    <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-6">
                        O Cérebro Criativo da Sua Agência
                    </h2>
                    <p className="text-brand-text/60 max-w-2xl mx-auto text-lg">
                        Não é apenas IA. É uma plataforma de CreativeOps desenhada para
                        escala.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {features.map((feature, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className={clsx(
                                "group relative overflow-hidden rounded-3xl border border-white/10 p-8 hover:border-brand-lime/50 transition-colors",
                                feature.className,
                                feature.bg
                            )}
                        >
                            <div className="relative z-10 h-full flex flex-col justify-between">
                                <div className="mb-8">
                                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-6 group-hover:bg-brand-lime group-hover:text-brand-void transition-colors">
                                        <feature.icon className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-3">
                                        {feature.title}
                                    </h3>
                                    <p className="text-brand-text/60 leading-relaxed">
                                        {feature.description}
                                    </p>
                                </div>

                                {/* Decorative Element */}
                                <div className="absolute right-0 bottom-0 opacity-10 group-hover:opacity-20 transition-opacity translate-x-1/4 translate-y-1/4">
                                    <feature.icon className="w-48 h-48" />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
