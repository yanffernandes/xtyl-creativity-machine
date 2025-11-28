"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { clsx } from "clsx";

const plans = [
    {
        name: "Starter",
        price: "149",
        description: "Para freelancers e eupreendedores.",
        features: [
            "1 Workspace",
            "3 Projetos Ativos",
            "500 Créditos de Geração",
            "Suporte via Email",
        ],
        cta: "Começar Teste Grátis",
        popular: false,
    },
    {
        name: "Pro Agency",
        price: "497",
        description: "Para agências que precisam de escala.",
        features: [
            "Workspaces Ilimitados",
            "Projetos Ilimitados",
            "5 Usuários Inclusos",
            "3.000 Créditos de Geração",
            "Brand Memory Avançado",
            "Prioridade na Fila (GPU)",
        ],
        cta: "Começar Teste Grátis",
        popular: true,
    },
];

export function Pricing() {
    return (
        <section className="py-24 px-4 bg-black relative">
            <div className="max-w-5xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-6">
                        Preço Simples. Retorno Imediato.
                    </h2>
                    <p className="text-brand-text/60 text-lg">
                        Cancele a qualquer momento. Sem contratos de fidelidade.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {plans.map((plan, i) => (
                        <motion.div
                            key={plan.name}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className={clsx(
                                "relative p-8 rounded-3xl border flex flex-col",
                                plan.popular
                                    ? "border-brand-lime bg-brand-lime/5"
                                    : "border-white/10 bg-white/5"
                            )}
                        >
                            {plan.popular && (
                                <div className="absolute -top-4 left-0 right-0 flex justify-center">
                                    <span className="bg-brand-lime text-brand-void px-4 py-1 rounded-full text-sm font-bold uppercase tracking-wider">
                                        Mais Popular
                                    </span>
                                </div>
                            )}

                            <div className="mb-8">
                                <h3 className="text-xl font-bold text-white mb-2">
                                    {plan.name}
                                </h3>
                                <div className="flex items-baseline gap-1 mb-4">
                                    <span className="text-sm text-brand-text/60">R$</span>
                                    <span className="text-5xl font-display font-bold text-white">
                                        {plan.price}
                                    </span>
                                    <span className="text-brand-text/60">/mês</span>
                                </div>
                                <p className="text-brand-text/60">{plan.description}</p>
                            </div>

                            <ul className="space-y-4 mb-8 flex-1">
                                {plan.features.map((feature) => (
                                    <li key={feature} className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-brand-lime/10 flex items-center justify-center shrink-0">
                                            <Check className="w-4 h-4 text-brand-lime" />
                                        </div>
                                        <span className="text-brand-text/80">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                className={clsx(
                                    "w-full py-4 rounded-xl font-bold transition-all",
                                    plan.popular
                                        ? "bg-brand-lime text-brand-void hover:opacity-90 hover:scale-[1.02]"
                                        : "bg-white text-brand-void hover:bg-brand-text"
                                )}
                            >
                                {plan.cta}
                            </button>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
