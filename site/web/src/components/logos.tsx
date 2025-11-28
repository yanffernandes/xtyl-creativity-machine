"use client";

import { motion } from "framer-motion";

const logos = [
    { name: "Agência Pulse", opacity: "opacity-50" },
    { name: "Studio 451", opacity: "opacity-40" },
    { name: "Vortex Digital", opacity: "opacity-60" },
    { name: "Nova Creative", opacity: "opacity-50" },
    { name: "Atlas Media", opacity: "opacity-40" },
];

export function Logos() {
    return (
        <section className="py-12 border-y border-white/5 bg-white/5 backdrop-blur-sm">
            <div className="max-w-6xl mx-auto px-4">
                <p className="text-center text-sm text-brand-text/40 mb-8 font-medium uppercase tracking-widest">
                    Usado por 150+ agências criativas
                </p>
                <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24">
                    {logos.map((logo, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className={`text-xl md:text-2xl font-display font-bold text-white ${logo.opacity} hover:opacity-100 transition-opacity cursor-default`}
                        >
                            {logo.name}
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
