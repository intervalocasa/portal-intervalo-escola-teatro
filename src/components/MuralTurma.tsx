/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, ChangeEvent, FormEvent } from "react";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  getDocs,
  serverTimestamp, 
  updateDoc, 
  doc, 
  deleteDoc,
  arrayUnion, 
  arrayRemove,
  Timestamp
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../lib/firebase";
import { Post, User } from "../types";
import { getUserDisplayName } from "../lib/userUtils";
import { motion, AnimatePresence } from "motion/react";
import { 
  Image as ImageIcon, 
  Send, 
  Drama,
  User as UserIcon, 
  X, 
  Camera,
  Loader2,
  Share2,
  Instagram,
  MessageCircle,
  Download,
  Award
} from "lucide-react";
import { handleFirestoreError, OperationType } from "../lib/firestoreErrorHandler";
import { Logo } from "./CommonComponents";
import { toPng } from 'html-to-image';
import { BADGES } from "../constants/badges";
import { checkForBlogueirinhoBadge } from "../lib/badgeUtils";

interface MuralTurmaProps {
  classId: string;
  currentUser: User | null;
  handleAwardBadge?: (studentId: string, badgeDef: any, customMessage?: string, forceUniqueKey?: string, classId?: string) => Promise<void>;
}

export const MuralTurma = ({ classId, currentUser, handleAwardBadge }: MuralTurmaProps) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sharingPost, setSharingPost] = useState<Post | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const postRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    if (!classId) {
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, "posts"),
      where("classId", "==", classId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      
      // Sort client-side to avoid index requirements
      newPosts.sort((a, b) => {
        const timeA = a.timestamp?.seconds || 0;
        const timeB = b.timestamp?.seconds || 0;
        return timeB - timeA;
      });

      setPosts(newPosts);
      setIsLoading(false);
    }, (error) => {
      setIsLoading(false);
      handleFirestoreError(error, OperationType.LIST, `posts (classId: ${classId})`);
    });

    return () => unsubscribe();
  }, [classId]);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePostSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser || (!content.trim() && !imageFile)) return;

    setIsPosting(true);
    try {
      let imageUrl = "";

      if (imageFile) {
        try {
          const storageRef = ref(storage, `posts/${classId}/${Date.now()}_${imageFile.name.replace(/[^a-zA-Z0-9.]/g, "_")}`);
          const uploadResult = await uploadBytes(storageRef, imageFile);
          imageUrl = await getDownloadURL(uploadResult.ref);
        } catch (storageError) {
          console.error("Erro no Firebase Storage:", storageError);
          alert("Erro ao enviar a imagem. Verifique se o Storage está configurado corretamente.");
          setIsPosting(false);
          return;
        }
      }

      await addDoc(collection(db, "posts"), {
        authorId: currentUser.id,
        authorName: getUserDisplayName(currentUser),
        classId,
        content: content.trim(),
        imageUrl: imageUrl || null,
        likes: [],
        forces: [],
        timestamp: serverTimestamp()
      });

      setContent("");
      removeImage();
      alert("Publicado com sucesso!");

      // Check for Blogueirinho badge
      if (handleAwardBadge) {
        await checkForBlogueirinhoBadge(currentUser.id, classId, handleAwardBadge);
      }
    } catch (error) {
      console.error("Erro ao publicar:", error);
      alert("Erro ao publicar no mural. Tente novamente.");
      handleFirestoreError(error, OperationType.CREATE, "posts");
    } finally {
      setIsPosting(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("Deseja realmente excluir esta postagem?")) return;
    try {
      await deleteDoc(doc(db, "posts", postId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `posts/${postId}`);
    }
  };

  const handleClearMural = async () => {
    if (!window.confirm("Deseja realmente excluir TODAS as postagens deste mural?")) return;
    try {
      const deletePromises = posts.map(p => deleteDoc(doc(db, "posts", p.id)));
      await Promise.all(deletePromises);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "posts");
    }
  };

  const toggleLike = async (post: Post) => {
    if (!currentUser) return;

    const isLiked = post.likes?.includes(currentUser.id);
    const postRef = doc(db, "posts", post.id);

    try {
      if (isLiked) {
        await updateDoc(postRef, {
          likes: arrayRemove(currentUser.id)
        });
      } else {
        await updateDoc(postRef, {
          likes: arrayUnion(currentUser.id)
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${post.id}`);
    }
  };

  const toggleForce = async (post: Post) => {
    if (!currentUser) return;

    const isForced = post.forces?.includes(currentUser.id);
    const postRef = doc(db, "posts", post.id);

    try {
      if (isForced) {
        await updateDoc(postRef, {
          forces: arrayRemove(currentUser.id)
        });
      } else {
        await updateDoc(postRef, {
          forces: arrayUnion(currentUser.id)
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${post.id}`);
    }
  };

  const capturePost = async (post: Post, type: 'instagram' | 'whatsapp' | 'download') => {
    const el = postRefs.current[post.id];
    if (!el) return;

    setIsCapturing(true);
    try {
      // Small delay to ensure any transitions are finished
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const dataUrl = await toPng(el, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        style: {
          borderRadius: '32px',
        }
      });

      if (type === 'download') {
        const link = document.createElement('a');
        link.download = `intervalo-post-${post.id}.png`;
        link.href = dataUrl;
        link.click();
      } else {
        // Try to use Web Share API if available (best for mobile)
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], 'post.png', { type: 'image/png' });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'Compartilhar Post - Intervalo',
              text: 'Confira este post no mural da Intervalo Escola de Teatro!'
            });
          } catch (shareError) {
            // If share fails, fallback to simple link for WhatsApp or alert instructions for Instagram
            if (type === 'whatsapp') {
              window.open(`https://wa.me/?text=${encodeURIComponent('Confira este post da Intervalo!')}`, '_blank');
            } else {
              alert("Para compartilhar no Instagram, baixe a imagem e faça o upload no seu Stories!");
            }
          }
        } else {
          // No Web Share API or file sharing not supported
          if (type === 'whatsapp') {
            window.open(`https://wa.me/?text=${encodeURIComponent('Confira este post da Intervalo!')}`, '_blank');
          } else {
            alert("Sua versão do navegador não suporta compartilhamento direto de arquivos. Facilitamos o download da imagem para você compartilhar manualmente!");
            const link = document.createElement('a');
            link.download = `intervalo-post-${post.id}.png`;
            link.href = dataUrl;
            link.click();
          }
        }
      }
    } catch (error) {
      console.error("Erro ao capturar post:", error);
      alert("Erro ao gerar imagem para compartilhamento.");
    } finally {
      setIsCapturing(false);
      setSharingPost(null);
    }
  };

  return (
    <div className="space-y-8 bg-white p-2 rounded-3xl">
      {/* Post Creation Unit */}
      <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 shadow-sm">
        <form onSubmit={handlePostSubmit} className="space-y-4">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-pro-teal shrink-0 shadow-sm">
              <UserIcon size={24} />
            </div>
            <div className="flex-1 space-y-3">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Compartilhe algo com a turma..."
                className="w-full bg-transparent border-none focus:ring-0 text-slate-700 font-medium placeholder:text-slate-400 resize-none min-h-[80px]"
              />
              
              <AnimatePresence>
                {imagePreview && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative inline-block"
                  >
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="max-h-64 rounded-2xl border border-slate-200 object-cover shadow-lg"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 p-1 bg-white hover:bg-slate-50 text-slate-400 hover:text-pro-orange rounded-full shadow-md border border-slate-100 transition-all"
                    >
                      <X size={16} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200/50 flex items-center justify-between">
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-200 transition-all shadow-sm group"
              >
                <Camera size={16} className="text-pro-teal group-hover:scale-110 transition-transform" />
                Imagem
              </button>
            </div>

            <button
              type="submit"
              disabled={isPosting || (!content.trim() && !imageFile)}
              className={`
                px-8 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg
                ${isPosting || (!content.trim() && !imageFile) 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' 
                  : 'bg-pro-teal text-white hover:brightness-110 shadow-teal-900/20'}
              `}
            >
              {isPosting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Publicar
            </button>
          </div>
        </form>
      </div>

      {/* Feed */}
      <div className="space-y-6">
        {(currentUser?.role === "Gestor" || currentUser?.role === "Diretor Pedagógico") && posts.length > 0 && (
          <div className="flex justify-end mb-4">
            <button
              onClick={handleClearMural}
              className="flex items-center gap-2 px-4 py-1.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all text-[9px] font-black uppercase tracking-widest border border-red-100"
            >
              <X size={14} />
              Limpar Mural
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
            <Loader2 size={32} className="animate-spin text-pro-teal" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Carregando mural...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-[32px] border border-dashed border-slate-200">
            <Drama size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-bold italic text-sm">O mural está vazio. Seja o primeiro a postar!</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {posts.map((post) => (
              <motion.div
                layout
                key={post.id}
                ref={(el) => postRefs.current[post.id] = el}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden group hover:shadow-md transition-all"
              >
                <div className="p-6">
                  {/* School Header */}
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-50">
                    <div className="flex items-center gap-3">
                      <Logo className="w-10 h-10 object-contain" />
                      <span className="text-[11px] font-black text-pro-teal uppercase tracking-widest">
                        Intervalo Escola de Teatro
                      </span>
                    </div>
                    {/* Share Button in Header */}
                    <button
                      onClick={() => setSharingPost(post)}
                      className="p-2.5 bg-slate-50 text-slate-400 hover:bg-pro-teal hover:text-white rounded-xl transition-all shadow-sm"
                      title="Compartilhar"
                    >
                      <Share2 size={16} />
                    </button>
                  </div>

                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-pro-teal/5 flex items-center justify-center text-pro-teal">
                        <UserIcon size={20} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-black text-slate-800 tracking-tight">{post.authorName}</h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          {post.timestamp?.toDate() ? new Intl.DateTimeFormat('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }).format(post.timestamp.toDate()) : 'Recentemente'}
                        </p>
                      </div>
                      {(currentUser?.role === "Gestor" || currentUser?.role === "Diretor Pedagógico") && (
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="Excluir Postagem"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>

                  <p className="text-slate-600 font-medium leading-relaxed mb-4 whitespace-pre-wrap">
                    {post.content}
                  </p>

                  {post.imageUrl && (
                    <div className="mb-4 rounded-2xl overflow-hidden border border-slate-100 shadow-inner bg-slate-50">
                      <img 
                        src={post.imageUrl} 
                        alt="Post content" 
                        className="w-full object-cover max-h-[500px]"
                      />
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-100 flex items-center gap-6">
                    <button
                      onClick={() => toggleLike(post)}
                      className={`
                        flex items-center gap-2 group transition-all
                        ${post.likes?.includes(currentUser?.id || "") 
                          ? 'text-pro-teal' 
                          : 'text-slate-400 hover:text-pro-teal'}
                      `}
                    >
                      <div className={`p-2 rounded-xl transition-all ${post.likes?.includes(currentUser?.id || "") ? 'bg-pro-teal/10' : 'bg-slate-50 group-hover:bg-pro-teal/5'}`}>
                        <span className={`text-[18px] ${post.likes?.includes(currentUser?.id || "") ? '' : 'grayscale opacity-70'}`}>
                          👏
                        </span>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {post.likes?.length || 0} Aplauso{post.likes?.length !== 1 ? 's' : ''}
                      </span>
                    </button>

                    <button
                      onClick={() => toggleForce(post)}
                      className={`
                        flex items-center gap-2 group transition-all
                        ${post.forces?.includes(currentUser?.id || "") 
                          ? 'text-pro-orange' 
                          : 'text-slate-400 hover:text-pro-orange'}
                      `}
                    >
                      <div className={`p-2 rounded-xl transition-all ${post.forces?.includes(currentUser?.id || "") ? 'bg-pro-orange/10' : 'bg-slate-50 group-hover:bg-pro-orange/5'}`}>
                        <span className={`text-[18px] ${post.forces?.includes(currentUser?.id || "") ? '' : 'grayscale opacity-70'}`}>
                          💪
                        </span>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {post.forces?.length || 0} Força, ícone!
                      </span>
                    </button>

                    <button
                      onClick={() => setSharingPost(post)}
                      className="flex items-center gap-2 text-slate-400 hover:text-pro-teal group transition-all"
                      title="Compartilhar"
                    >
                      <div className="p-2 rounded-xl bg-slate-50 group-hover:bg-pro-teal/5 transition-all">
                        <Share2 size={18} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        Compartilhar
                      </span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {sharingPost && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100"
            >
              <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="bg-pro-teal/10 p-2 rounded-xl text-pro-teal">
                    <Share2 size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Compartilhar Post</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Escolha por onde quer brilhar</p>
                  </div>
                </div>
                <button onClick={() => setSharingPost(null)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-3">
                <button
                  disabled={isCapturing}
                  onClick={() => capturePost(sharingPost, 'instagram')}
                  className="w-full p-5 bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] rounded-2xl flex items-center gap-4 group hover:scale-[1.02] transition-all text-white shadow-lg active:scale-95 disabled:opacity-50 disabled:grayscale"
                >
                  <div className="bg-white/20 p-3 rounded-xl shadow-inner">
                    <Instagram size={24} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black uppercase tracking-tight">Instagram Stories</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest opacity-80">Compartilhar sua conquista</p>
                  </div>
                  {isCapturing && <Loader2 size={16} className="animate-spin ml-auto" />}
                </button>

                <button
                  disabled={isCapturing}
                  onClick={() => capturePost(sharingPost, 'whatsapp')}
                  className="w-full p-5 bg-[#25D366] rounded-2xl flex items-center gap-4 group hover:scale-[1.02] transition-all text-white shadow-lg active:scale-95 disabled:opacity-50 disabled:grayscale"
                >
                  <div className="bg-black/10 p-3 rounded-xl shadow-inner">
                    <MessageCircle size={24} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black uppercase tracking-tight">WhatsApp</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest opacity-80">Enviar para amigos ou grupo</p>
                  </div>
                  {isCapturing && <Loader2 size={16} className="animate-spin ml-auto" />}
                </button>

                <button
                  disabled={isCapturing}
                  onClick={() => capturePost(sharingPost, 'download')}
                  className="w-full p-5 bg-slate-800 rounded-2xl flex items-center gap-4 group hover:scale-[1.02] transition-all text-white shadow-lg active:scale-95 disabled:opacity-50 disabled:grayscale"
                >
                  <div className="bg-white/10 p-3 rounded-xl shadow-inner">
                    <Download size={24} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black uppercase tracking-tight">Baixar Imagem</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest opacity-80">Salvar no seu dispositivo</p>
                  </div>
                  {isCapturing && <Loader2 size={16} className="animate-spin ml-auto" />}
                </button>
              </div>
              
              <div className="p-6 bg-slate-50 border-t border-slate-100 mt-2">
                <p className="text-[8px] font-black text-slate-400 uppercase text-center tracking-[0.2em] leading-relaxed">
                  Ao compartilhar, uma imagem do post será gerada <br/> automaticamente para você.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
