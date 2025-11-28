"use client";

import { motion } from "framer-motion";
import { Quote } from "lucide-react";

const testimonials = [
    {
        quote:
            "Economizamos R$ 15.000/mês que gastaríamos contratando 2 designers júnior. O Xynapse se pagou na primeira semana.",
        author: "Paula Andrade",
        role: "CEO, Agência Pulse Digital",
    },
    {
        quote:
            "A consistência de marca melhorou 10x. Antes, cada criativo entregava no seu estilo. Agora todos entregam no estilo do cliente.",
        author: "Thiago Moura",
        role: "Diretor de Criação, Estúdio 451",
    },
];

export function Testimonials() {
    return (
        <section className="py-24 px-4 bg-brand-void relative">
            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {testimonials.map((t, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="p-10 rounded-3xl bg-white/5 border border-white/10 relative"
                        >
                            <Quote className="w-12 h-12 text-brand-lime/20 mb-6" />
                            <p className="text-xl md:text-2xl font-medium text-white mb-8 leading-relaxed">
                                "{t.quote}"
                            </p>
                            <div>
                                <div className="font-bold text-white text-lg">{t.author}</div>
                                <div className="text-brand-lime">{t.role}</div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
