"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
    LayoutGrid,
    MessageSquare,
    Settings,
    Search,
    Plus,
    MoreHorizontal,
    FileText,
    Image as ImageIcon,
    Bot,
    Send
} from "lucide-react";

export function Demo() {
    const ref = useRef<HTMLDivElement>(null);

    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseX = useSpring(x, { stiffness: 500, damping: 50 });
    const mouseY = useSpring(y, { stiffness: 500, damping: 50 });

    const rotateX = useTransform(mouseY, [-0.5, 0.5], ["5deg", "-5deg"]);
    const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-5deg", "5deg"]);

    function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseXFromCenter = event.clientX - rect.left - width / 2;
        const mouseYFromCenter = event.clientY - rect.top - height / 2;
        x.set(mouseXFromCenter / width);
        y.set(mouseYFromCenter / height);
    }

    function handleMouseLeave() {
        x.set(0);
        y.set(0);
    }

    return (
        <section className="py-20 px-4 overflow-hidden perspective-1000">
            <div className="max-w-6xl mx-auto">
                <motion.div
                    ref={ref}
                    style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    className="relative w-full aspect-[16/9] rounded-xl bg-[#0A0A0A] border border-white/10 shadow-2xl shadow-brand-lime/10 flex overflow-hidden group"
                >
                    {/* --- LEFT SIDEBAR --- */}
                    <motion.div
                        style={{ translateZ: 20 }}
                        className="w-64 border-r border-white/5 bg-[#0F0F0F] p-4 flex flex-col gap-6 hidden md:flex"
                    >
                        <div className="flex items-center gap-2 px-2">
                            <div className="w-6 h-6 rounded bg-brand-lime flex items-center justify-center text-black font-bold text-xs">X</div>
                            <span className="font-bold text-white">Xynapse</span>
                        </div>

                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-white/20" />
                            <div className="w-full bg-white/5 rounded-lg h-9 border border-white/5" />
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 text-white text-sm">
                                <LayoutGrid className="w-4 h-4" />
                                <span>Projetos</span>
                            </div>
                            <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/40 text-sm hover:text-white transition-colors">
                                <MessageSquare className="w-4 h-4" />
                                <span>Mensagens</span>
                            </div>
                            <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/40 text-sm hover:text-white transition-colors">
                                <Settings className="w-4 h-4" />
                                <span>Configurações</span>
                            </div>
                        </div>

                        <div className="mt-auto">
                            <div className="h-10 w-full rounded-lg bg-gradient-to-r from-brand-lime/20 to-transparent p-[1px]">
                                <div className="h-full w-full bg-[#0F0F0F] rounded-lg flex items-center px-3 gap-2">
                                    <div className="w-2 h-2 rounded-full bg-brand-lime animate-pulse" />
                                    <span className="text-xs text-brand-lime font-medium">System Online</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* --- MAIN CONTENT (KANBAN) --- */}
                    <div className="flex-1 bg-[#0A0A0A] p-6 flex flex-col relative">
                        {/* Header */}
                        <motion.div
                            style={{ translateZ: 30 }}
                            className="flex items-center justify-between mb-8"
                        >
                            <div>
                                <h2 className="text-xl font-bold text-white">Campanha Black Friday</h2>
                                <p className="text-xs text-white/40">Nike • 25 Assets</p>
                            </div>
                            <div className="flex gap-2">
                                <div className="px-3 py-1.5 rounded-md bg-brand-lime text-black text-xs font-bold flex items-center gap-1">
                                    <Plus className="w-3 h-3" /> Novo
                                </div>
                            </div>
                        </motion.div>

                        {/* Kanban Columns */}
                        <div className="flex gap-4 h-full">
                            {/* Column 1 */}
                            <motion.div
                                style={{ translateZ: 40 }}
                                className="flex-1 bg-[#0F0F0F] rounded-xl p-3 flex flex-col gap-3 border border-white/5"
                            >
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-xs font-medium text-white/60">A Fazer</span>
                                    <span className="text-xs text-white/20">3</span>
                                </div>
                                {/* Card 1 */}
                                <motion.div
                                    whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.08)" }}
                                    className="p-3 rounded-lg bg-[#141414] border border-white/5 space-y-2 cursor-pointer group/card"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="p-1.5 rounded bg-blue-500/10 text-blue-500"><FileText className="w-3 h-3" /></div>
                                        <MoreHorizontal className="w-3 h-3 text-white/20" />
                                    </div>
                                    <p className="text-sm text-white font-medium">Copy Instagram Stories</p>
                                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full w-2/3 bg-blue-500/50" />
                                    </div>
                                </motion.div>
                                {/* Card 2 */}
                                <motion.div
                                    whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.08)" }}
                                    className="p-3 rounded-lg bg-[#141414] border border-white/5 space-y-2 cursor-pointer"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="p-1.5 rounded bg-purple-500/10 text-purple-500"><ImageIcon className="w-3 h-3" /></div>
                                        <MoreHorizontal className="w-3 h-3 text-white/20" />
                                    </div>
                                    <p className="text-sm text-white font-medium">Banner Hero Site</p>
                                </motion.div>
                            </motion.div>

                            {/* Column 2 (Active) */}
                            <motion.div
                                style={{ translateZ: 50 }}
                                className="flex-1 bg-[#0F0F0F] rounded-xl p-3 flex flex-col gap-3 border border-brand-lime/20 shadow-[0_0_30px_-10px_rgba(204,255,0,0.1)]"
                            >
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-xs font-medium text-brand-lime">Gerando (IA)</span>
                                    <div className="w-1.5 h-1.5 rounded-full bg-brand-lime animate-pulse" />
                                </div>
                                {/* Active Card */}
                                <motion.div
                                    layoutId="active-card"
                                    className="p-3 rounded-lg bg-[#1A1A1A] border border-brand-lime/30 space-y-3 relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-lime/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />

                                    <div className="aspect-video w-full rounded bg-black/50 relative overflow-hidden border border-white/10">
                                        {/* Simulated Image Generation */}
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="text-xs text-brand-lime font-mono">Generating...</div>
                                        </div>
                                    </div>
                                    <p className="text-sm text-white font-medium">Variação 04 - Lifestyle</p>
                                    <div className="flex gap-2">
                                        <div className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-white/60">Urban</div>
                                        <div className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-white/60">Neon</div>
                                    </div>
                                </motion.div>
                            </motion.div>

                            {/* Column 3 */}
                            <motion.div
                                style={{ translateZ: 30 }}
                                className="flex-1 bg-[#0F0F0F] rounded-xl p-3 flex flex-col gap-3 border border-white/5 hidden lg:flex"
                            >
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-xs font-medium text-white/60">Concluído</span>
                                    <span className="text-xs text-white/20">12</span>
                                </div>
                                {/* Done Card */}
                                <motion.div className="p-3 rounded-lg bg-[#141414] border border-white/5 opacity-60">
                                    <div className="flex justify-between items-start">
                                        <div className="p-1.5 rounded bg-green-500/10 text-green-500"><FileText className="w-3 h-3" /></div>
                                    </div>
                                    <p className="text-sm text-white font-medium line-through">Email Marketing #1</p>
                                </motion.div>
                            </motion.div>
                        </div>
                    </div>

                    {/* --- RIGHT SIDEBAR (CHAT) --- */}
                    <motion.div
                        style={{ translateZ: 60 }}
                        className="w-80 border-l border-white/5 bg-[#0F0F0F] flex flex-col hidden xl:flex shadow-2xl"
                    >
                        <div className="p-4 border-b border-white/5 flex items-center justify-between">
                            <span className="text-sm font-bold text-white">Assistente IA</span>
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                        </div>

                        <div className="flex-1 p-4 space-y-4 overflow-hidden relative">
                            {/* Message 1 */}
                            <div className="flex gap-3">
                                <div className="w-6 h-6 rounded bg-white/10 flex-shrink-0" />
                                <div className="bg-white/5 p-3 rounded-lg rounded-tl-none text-xs text-white/80 leading-relaxed">
                                    Analisei o brandbook da Nike. O tom de voz deve ser "Inspirador" e "Direto".
                                </div>
                            </div>
                            {/* Message 2 */}
                            <div className="flex gap-3 flex-row-reverse">
                                <div className="w-6 h-6 rounded bg-brand-lime flex-shrink-0" />
                                <div className="bg-brand-lime/10 p-3 rounded-lg rounded-tr-none text-xs text-brand-lime leading-relaxed border border-brand-lime/20">
                                    Gere 3 variações de imagem para o post de corrida noturna.
                                </div>
                            </div>
                            {/* Message 3 (Typing) */}
                            <div className="flex gap-3">
                                <div className="w-6 h-6 rounded bg-white/10 flex-shrink-0 flex items-center justify-center">
                                    <Bot className="w-3 h-3 text-white/60" />
                                </div>
                                <div className="bg-white/5 p-3 rounded-lg rounded-tl-none text-xs text-white/60 flex items-center gap-1">
                                    <span>Gerando variações</span>
                                    <span className="animate-bounce">.</span>
                                    <span className="animate-bounce delay-100">.</span>
                                    <span className="animate-bounce delay-200">.</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-white/5">
                            <div className="flex gap-2">
                                <div className="flex-1 h-8 bg-white/5 rounded border border-white/5" />
                                <div className="w-8 h-8 bg-brand-lime rounded flex items-center justify-center">
                                    <Send className="w-3 h-3 text-black" />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
