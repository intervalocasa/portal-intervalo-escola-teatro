import { motion, AnimatePresence } from "motion/react";
import { X, Download, Monitor, Smartphone, Share, PlusSquare, ArrowUpCircle } from "lucide-react";
import { useEffect, useState } from "react";

interface InstallPWAModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onInstallSuccess: () => void;
}

export const InstallPWAModal = ({ isOpen, onClose, deferredPrompt, onInstallSuccess }: InstallPWAModalProps) => {
  const [deviceType, setDeviceType] = useState<"ios" | "android" | "desktop">("desktop");

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setDeviceType("ios");
    } else if (/android/.test(ua)) {
      setDeviceType("android");
    } else {
      setDeviceType("desktop");
    }
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      onInstallSuccess();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden border-4 border-white"
        >
          {/* Header */}
          <div className="bg-[#016a86] p-8 text-center text-white relative">
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/10 flex items-center justify-center hover:bg-black/20 transition-all"
            >
              <X size={20} />
            </button>
            <div className="w-20 h-20 bg-white rounded-[32px] mx-auto mb-4 flex items-center justify-center text-[#016a86] shadow-xl">
              <Download size={40} />
            </div>
            <h2 className="text-2xl font-black tracking-tight uppercase">Instalar App</h2>
            <p className="text-teal-50/70 text-[10px] font-black uppercase tracking-widest mt-1">Acesso rápido e offline</p>
          </div>

          {/* Content */}
          <div className="p-8 space-y-6">
            {deviceType === "ios" ? (
              <div className="space-y-6">
                <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-pro-teal/10 flex items-center justify-center text-pro-teal shrink-0">
                    <Share size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">Passo 1</h4>
                    <p className="text-[11px] font-medium text-slate-500 leading-tight mt-1">
                      Toque no ícone de <span className="font-bold">Compartilhar</span> na barra inferior do Safari.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-pro-teal/10 flex items-center justify-center text-pro-teal shrink-0">
                    <PlusSquare size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">Passo 2</h4>
                    <p className="text-[11px] font-medium text-slate-500 leading-tight mt-1">
                      Role para baixo e selecione <span className="font-bold">"Adicionar à Tela de Início"</span>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-pro-teal/10 flex items-center justify-center text-pro-teal shrink-0">
                    <ArrowUpCircle size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">Pronto!</h4>
                    <p className="text-[11px] font-medium text-slate-500 leading-tight mt-1">
                      Toque em <span className="font-bold">"Adicionar"</span> no canto superior direito para finalizar.
                    </p>
                  </div>
                </div>
              </div>
            ) : deviceType === "android" ? (
              <div className="space-y-6">
                {deferredPrompt ? (
                  <div className="space-y-6 text-center">
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 italic text-slate-500 text-sm">
                      "Clique no botão abaixo para instalar o app diretamente no seu dispositivo Android e aproveitar a melhor experiência."
                    </div>
                    <button
                      onClick={handleInstallClick}
                      className="w-full py-5 bg-pro-teal text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-[#014e63] transition-all shadow-xl shadow-teal-900/10 active:scale-95"
                    >
                      Instalar agora
                    </button>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ou faça manualmente:</div>
                  </div>
                ) : null}

                <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-pro-teal/10 flex items-center justify-center text-pro-teal shrink-0">
                    <div className="flex flex-col gap-0.5 items-center">
                      <div className="w-1 h-1 rounded-full bg-current" />
                      <div className="w-1 h-1 rounded-full bg-current" />
                      <div className="w-1 h-1 rounded-full bg-current" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">Passo 1</h4>
                    <p className="text-[11px] font-medium text-slate-500 leading-tight mt-1">
                      Toque nos <span className="font-bold">três pontos (⋮)</span> no canto superior direito do Chrome.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-pro-teal/10 flex items-center justify-center text-pro-teal shrink-0">
                    <PlusSquare size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">Passo 2</h4>
                    <p className="text-[11px] font-medium text-slate-500 leading-tight mt-1">
                      Toque em <span className="font-bold">"Instalar aplicativo"</span> ou <span className="font-bold">"Adicionar à tela inicial"</span>.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex gap-3">
                  <div className="text-orange-500 shrink-0">
                    <Smartphone size={16} />
                  </div>
                  <p className="text-[10px] font-bold text-orange-700 leading-tight">
                    Isso cria um ícone na sua área de trabalho que funciona exatamente como um aplicativo nativo.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-pro-teal/10 flex items-center justify-center text-pro-teal shrink-0">
                    {deviceType === "desktop" ? <Monitor size={20} /> : <Smartphone size={20} />}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">
                      {deviceType === "desktop" ? "Instalação no Desktop" : "Instalação no Mobile"}
                    </h4>
                    <p className="text-[11px] font-medium text-slate-500 leading-tight mt-1">
                      Procure pelo ícone de instalação na barra de endereços (Chrome/Edge) ou acesse as opções do navegador para <span className="font-bold">instalar o app</span>.
                    </p>
                  </div>
                </div>
                
                <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex gap-3">
                  <div className="text-orange-500 shrink-0">
                    <Smartphone size={16} />
                  </div>
                  <p className="text-[10px] font-bold text-orange-700 leading-tight">
                    Dica: No celular, usar "Adicionar à tela inicial" cria um ícone que funciona exatamente como um aplicativo nativo.
                  </p>
                </div>

                {deferredPrompt && (
                  <button
                    onClick={handleInstallClick}
                    className="w-full py-5 bg-pro-teal text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-[#014e63] transition-all shadow-xl shadow-teal-900/10 active:scale-95"
                  >
                    Instalar Aplicativo
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
            <button 
              onClick={onClose}
              className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
            >
              Fechar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
