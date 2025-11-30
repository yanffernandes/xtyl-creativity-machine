export function Footer() {
    return (
        <footer className="py-12 px-4 bg-black border-t border-white/10">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-brand-lime flex items-center justify-center font-bold text-brand-void">
                        X
                    </div>
                    <span className="text-xl font-display font-bold text-white">
                        Xynapse
                    </span>
                </div>

                <div className="text-brand-text/40 text-sm">
                    © {new Date().getFullYear()} Xynapse. All rights reserved.
                </div>

                <div className="flex items-center gap-6 text-sm text-brand-text/60">
                    <a href="#" className="hover:text-brand-lime transition-colors">
                        LinkedIn
                    </a>
                    <a href="#" className="hover:text-brand-lime transition-colors">
                        Instagram
                    </a>
                    <a href="#" className="hover:text-brand-lime transition-colors">
                        Contato
                    </a>
                </div>
            </div>
        </footer>
    );
}
