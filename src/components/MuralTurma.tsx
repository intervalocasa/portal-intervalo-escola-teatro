/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, ChangeEvent, FormEvent } from "react";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  updateDoc, 
  doc, 
  deleteDoc,
  arrayUnion, 
  arrayRemove
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, auth } from "../lib/firebase";
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
  CheckCircle2,
  Maximize2,
  Trash2
} from "lucide-react";
import { handleFirestoreError, OperationType } from "../lib/firestoreErrorHandler";
import { Logo } from "./CommonComponents";
import { toPng } from 'html-to-image';
import { checkForBlogueirinhoBadge } from "../lib/badgeUtils";
import { compressImage } from "../lib/imageUtils";

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
  const [postingStatus, setPostingStatus] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [sharingPost, setSharingPost] = useState<Post | null>(null);
  const [selectedImageModal, setSelectedImageModal] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
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

  const showFeedback = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
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
    setPostingStatus("Preparando publicação...");

    try {
      let imageUrl = "";

      if (imageFile) {
        setPostingStatus("Otimizando foto...");
        // 1. Client-side high performance compression (max 1200px, quality 0.82)
        const compressed = await compressImage(imageFile, 1200, 1200, 0.82);

        // 2. Try Firebase Storage first with short timeout, fallback to compressed Base64
        setPostingStatus("Enviando foto...");
        try {
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Storage timeout")), 5000)
          );

          const uploadPromise = (async () => {
            const fileName = `${Date.now()}_${imageFile.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
            const storageRef = ref(storage, `posts/${classId}/${fileName}`);
            const uploadResult = await uploadBytes(storageRef, compressed.blob);
            return await getDownloadURL(uploadResult.ref);
          })();

          imageUrl = await Promise.race([uploadPromise, timeoutPromise]);
        } catch (storageError) {
          console.warn("Storage upload not available or timed out, using compressed base64 fallback:", storageError);
          // Seamlessly use optimized base64 Data URL as fallback
          imageUrl = compressed.dataUrl;
        }
      }

      setPostingStatus("Gravando no mural...");
      const authorId = currentUser.id || auth.currentUser?.uid || "";
      const authorName = getUserDisplayName(currentUser);
      const authorPhoto = currentUser.photo || null;

      await addDoc(collection(db, "posts"), {
        authorId,
        authorName,
        authorPhoto,
        classId,
        content: content.trim(),
        imageUrl: imageUrl || null,
        likes: [],
        forces: [],
        timestamp: serverTimestamp()
      });

      setContent("");
      removeImage();
      showFeedback("Publicação compartilhada com sucesso no mural!", "success");

      // Check for Blogueirinho badge
      if (handleAwardBadge && currentUser.id) {
        await checkForBlogueirinhoBadge(currentUser.id, classId, handleAwardBadge);
      }
    } catch (error) {
      console.error("Erro ao publicar no mural:", error);
      showFeedback("Erro ao publicar no mural. Tente novamente.", "error");
      handleFirestoreError(error, OperationType.CREATE, "posts");
    } finally {
      setIsPosting(false);
      setPostingStatus("");
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("Deseja realmente excluir esta postagem?")) return;
    try {
      await deleteDoc(doc(db, "posts", postId));
      showFeedback("Postagem removida.", "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `posts/${postId}`);
    }
  };

  const handleClearMural = async () => {
    if (!window.confirm("Deseja realmente excluir TODAS as postagens deste mural? Esta ação não pode ser desfeita.")) return;
    try {
      const deletePromises = posts.map(p => deleteDoc(doc(db, "posts", p.id)));
      await Promise.all(deletePromises);
      showFeedback("Mural limpo com sucesso.", "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "posts");
    }
  };

  const toggleLike = async (post: Post) => {
    if (!currentUser) return;
    const userId = currentUser.id || auth.currentUser?.uid || "";
    if (!userId) return;

    const isLiked = post.likes?.includes(userId);
    const postRef = doc(db, "posts", post.id);

    try {
      if (isLiked) {
        await updateDoc(postRef, {
          likes: arrayRemove(userId)
        });
      } else {
        await updateDoc(postRef, {
          likes: arrayUnion(userId)
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${post.id}`);
    }
  };

  const toggleForce = async (post: Post) => {
    if (!currentUser) return;
    const userId = currentUser.id || auth.currentUser?.uid || "";
    if (!userId) return;

    const isForced = post.forces?.includes(userId);
    const postRef = doc(db, "posts", post.id);

    try {
      if (isForced) {
        await updateDoc(postRef, {
          forces: arrayRemove(userId)
        });
      } else {
        await updateDoc(postRef, {
          forces: arrayUnion(userId)
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
            if (type === 'whatsapp') {
              window.open(`https://wa.me/?text=${encodeURIComponent('Confira este post da Intervalo!')}`, '_blank');
            } else {
              alert("Para compartilhar no Instagram, baixe a imagem e faça o upload no seu Stories!");
            }
          }
        } else {
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

  const isAuthorOrAdmin = (post: Post) => {
    if (!currentUser) return false;
    const isGestor = currentUser.role === "Gestor" || currentUser.role === "Diretor Pedagógico" || currentUser.role === "Diretor Pedagógico e Professor";
    const isOwner = post.authorId === currentUser.id || (auth.currentUser && post.authorId === auth.currentUser.uid);
    return isGestor || isOwner;
  };

  return (
    <div className="space-y-6 bg-white p-2 rounded-3xl relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-black uppercase tracking-wider text-white border ${
              notification.type === "success"
                ? "bg-emerald-600 border-emerald-500 shadow-emerald-900/20"
                : "bg-rose-600 border-rose-500 shadow-rose-900/20"
            }`}
          >
            {notification.type === "success" ? <CheckCircle2 size={18} /> : <X size={18} />}
            <span>{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Post Creation Unit */}
      <div className="bg-slate-50 p-5 sm:p-6 rounded-[32px] border border-slate-100 shadow-xs">
        <form onSubmit={handlePostSubmit} className="space-y-4">
          <div className="flex gap-3 sm:gap-4 items-start">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center text-pro-teal shrink-0 shadow-xs">
              {currentUser?.photo ? (
                <img src={currentUser.photo} alt={currentUser.name} className="w-full h-full object-cover" />
              ) : (
                <UserIcon size={22} />
              )}
            </div>
            <div className="flex-1 space-y-3">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Compartilhe uma foto, reflexão ou novidade com a turma..."
                rows={3}
                className="w-full bg-transparent border-none focus:ring-0 text-slate-700 font-medium placeholder:text-slate-400 resize-none min-h-[70px] text-sm focus:outline-none"
              />
              
              <AnimatePresence>
                {imagePreview && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative inline-block mt-2"
                  >
                    <img 
                      src={imagePreview} 
                      alt="Prévia da foto" 
                      className="max-h-64 sm:max-h-72 rounded-2xl border border-slate-200 object-cover shadow-md"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 p-1.5 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-full shadow-md border border-slate-200 transition-all"
                      title="Remover foto"
                    >
                      <X size={16} />
                    </button>
                    <div className="absolute bottom-2 left-2 bg-slate-900/70 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-xl">
                      Foto anexada ({imageFile ? `${(imageFile.size / 1024 / 1024).toFixed(1)} MB` : ''})
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
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
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all shadow-xs group ${
                  imageFile 
                    ? "bg-teal-50 border-teal-200 text-teal-800" 
                    : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
                }`}
              >
                <Camera size={16} className={`${imageFile ? "text-pro-teal" : "text-pro-teal"} group-hover:scale-110 transition-transform`} />
                <span>{imageFile ? "Trocar Foto" : "Adicionar Foto"}</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={isPosting || (!content.trim() && !imageFile)}
              className={`
                px-6 sm:px-8 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-md
                ${isPosting || (!content.trim() && !imageFile) 
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                  : 'bg-pro-teal text-white hover:bg-teal-700 active:scale-95 shadow-teal-900/10'}
              `}
            >
              {isPosting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{postingStatus || "Publicando..."}</span>
                </>
              ) : (
                <>
                  <Send size={15} />
                  <span>Publicar</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Feed Section */}
      <div className="space-y-6">
        {(currentUser?.role === "Gestor" || currentUser?.role === "Diretor Pedagógico" || currentUser?.role === "Diretor Pedagógico e Professor") && posts.length > 0 && (
          <div className="flex justify-end mb-2">
            <button
              onClick={handleClearMural}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl transition-all text-[9px] font-black uppercase tracking-widest border border-rose-100"
            >
              <Trash2 size={13} />
              Limpar Todo o Mural
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
            <Loader2 size={32} className="animate-spin text-pro-teal" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Carregando mural da turma...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 rounded-[32px] border border-dashed border-slate-200 p-6">
            <Drama size={44} className="mx-auto text-slate-300 mb-3" />
            <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider mb-1">Mural da Turma</h4>
            <p className="text-slate-400 font-medium text-xs max-w-sm mx-auto">
              Nenhuma publicação ainda. Tire uma foto das aulas ou deixe uma mensagem para os seus colegas de elenco!
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {posts.map((post) => {
              const currentUserId = currentUser?.id || auth.currentUser?.uid || "";
              const hasLiked = currentUserId ? post.likes?.includes(currentUserId) : false;
              const hasForced = currentUserId ? post.forces?.includes(currentUserId) : false;
              const canDelete = isAuthorOrAdmin(post);

              return (
                <motion.div
                  layout
                  key={post.id}
                  ref={(el) => { postRefs.current[post.id] = el; }}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-[32px] border border-slate-100 shadow-xs overflow-hidden group hover:shadow-md transition-all"
                >
                  <div className="p-5 sm:p-6">
                    {/* School Header */}
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-50">
                      <div className="flex items-center gap-2.5">
                        <Logo className="w-8 h-8 object-contain" />
                        <span className="text-[10px] font-black text-pro-teal uppercase tracking-widest">
                          Intervalo Escola de Teatro
                        </span>
                      </div>
                      <button
                        onClick={() => setSharingPost(post)}
                        className="p-2 bg-slate-50 text-slate-400 hover:bg-pro-teal hover:text-white rounded-xl transition-all shadow-xs"
                        title="Compartilhar post"
                      >
                        <Share2 size={15} />
                      </button>
                    </div>

                    {/* Author Bar */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 overflow-hidden flex items-center justify-center text-pro-teal shrink-0">
                        {post.authorPhoto ? (
                          <img src={post.authorPhoto} alt={post.authorName} className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon size={20} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-black text-slate-800 tracking-tight truncate">{post.authorName}</h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          {post.timestamp?.toDate ? new Intl.DateTimeFormat('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }).format(post.timestamp.toDate()) : 'Recentemente'}
                        </p>
                      </div>
                      {canDelete && (
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          title="Excluir postagem"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    {/* Content Text */}
                    {post.content && (
                      <p className="text-slate-700 font-medium leading-relaxed mb-4 whitespace-pre-wrap text-sm">
                        {post.content}
                      </p>
                    )}

                    {/* Attached Photo */}
                    {post.imageUrl && (
                      <div 
                        onClick={() => setSelectedImageModal(post.imageUrl || null)}
                        className="mb-4 rounded-2xl overflow-hidden border border-slate-100 shadow-inner bg-slate-900/5 cursor-pointer relative group/img"
                      >
                        <img 
                          src={post.imageUrl} 
                          alt="Foto do mural" 
                          className="w-full object-cover max-h-[500px] hover:scale-[1.01] transition-transform duration-300"
                          loading="lazy"
                        />
                        <div className="absolute bottom-3 right-3 p-2 bg-black/60 backdrop-blur-xs text-white rounded-xl opacity-0 group-hover/img:opacity-100 transition-opacity">
                          <Maximize2 size={16} />
                        </div>
                      </div>
                    )}

                    {/* Reactions & Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleLike(post)}
                          className={`
                            flex items-center gap-2 group transition-all px-3 py-1.5 rounded-xl border
                            ${hasLiked 
                              ? 'bg-teal-50 border-teal-200 text-teal-800 font-black' 
                              : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'}
                          `}
                        >
                          <span className={`text-base ${hasLiked ? '' : 'grayscale opacity-75 group-hover:grayscale-0'}`}>
                            👏
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-wider">
                            {post.likes?.length || 0} {post.likes?.length === 1 ? 'Aplauso' : 'Aplausos'}
                          </span>
                        </button>

                        <button
                          onClick={() => toggleForce(post)}
                          className={`
                            flex items-center gap-2 group transition-all px-3 py-1.5 rounded-xl border
                            ${hasForced 
                              ? 'bg-orange-50 border-orange-200 text-orange-800 font-black' 
                              : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'}
                          `}
                        >
                          <span className={`text-base ${hasForced ? '' : 'grayscale opacity-75 group-hover:grayscale-0'}`}>
                            💪
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-wider">
                            {post.forces?.length || 0} Força
                          </span>
                        </button>
                      </div>

                      <button
                        onClick={() => setSharingPost(post)}
                        className="flex items-center gap-1.5 text-slate-400 hover:text-pro-teal px-3 py-1.5 rounded-xl hover:bg-slate-50 transition-all"
                        title="Compartilhar"
                      >
                        <Share2 size={15} />
                        <span className="text-[10px] font-black uppercase tracking-wider">
                          Compartilhar
                        </span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox Modal for Photo Zoom */}
      <AnimatePresence>
        {selectedImageModal && (
          <div 
            onClick={() => setSelectedImageModal(null)}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md cursor-zoom-out"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-4xl max-h-[90vh] flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={selectedImageModal} 
                alt="Visualização ampliada" 
                className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-white/10"
              />
              <button
                onClick={() => setSelectedImageModal(null)}
                className="absolute top-3 right-3 p-2.5 bg-black/60 hover:bg-black text-white rounded-full transition-all"
                title="Fechar"
              >
                <X size={20} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        {sharingPost && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100"
            >
              <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="bg-teal-50 p-2 rounded-xl text-pro-teal">
                    <Share2 size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Compartilhar Post</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Escolha por onde quer compartilhar</p>
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
                  className="w-full p-4 bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] rounded-2xl flex items-center gap-4 group hover:scale-[1.02] transition-all text-white shadow-md active:scale-95 disabled:opacity-50 disabled:grayscale"
                >
                  <div className="bg-white/20 p-2.5 rounded-xl shadow-inner">
                    <Instagram size={22} />
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
                  className="w-full p-4 bg-[#25D366] rounded-2xl flex items-center gap-4 group hover:scale-[1.02] transition-all text-white shadow-md active:scale-95 disabled:opacity-50 disabled:grayscale"
                >
                  <div className="bg-black/10 p-2.5 rounded-xl shadow-inner">
                    <MessageCircle size={22} />
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
                  className="w-full p-4 bg-slate-800 rounded-2xl flex items-center gap-4 group hover:scale-[1.02] transition-all text-white shadow-md active:scale-95 disabled:opacity-50 disabled:grayscale"
                >
                  <div className="bg-white/10 p-2.5 rounded-xl shadow-inner">
                    <Download size={22} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black uppercase tracking-tight">Baixar Imagem</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest opacity-80">Salvar no seu dispositivo</p>
                  </div>
                  {isCapturing && <Loader2 size={16} className="animate-spin ml-auto" />}
                </button>
              </div>
              
              <div className="p-5 bg-slate-50 border-t border-slate-100">
                <p className="text-[9px] font-bold text-slate-400 text-center uppercase tracking-wider">
                  Ao compartilhar, uma imagem personalizada será gerada automaticamente.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

