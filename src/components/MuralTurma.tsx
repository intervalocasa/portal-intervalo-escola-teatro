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
  serverTimestamp, 
  updateDoc, 
  doc, 
  arrayUnion, 
  arrayRemove 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../lib/firebase";
import { Post, User } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { 
  Image as ImageIcon, 
  Send, 
  Drama,
  User as UserIcon, 
  X, 
  Camera,
  Loader2,
  ThumbsUp,
  Zap
} from "lucide-react";
import { handleFirestoreError, OperationType } from "../lib/firestoreErrorHandler";

interface MuralTurmaProps {
  classId: string;
  currentUser: User | null;
}

export const MuralTurma = ({ classId, currentUser }: MuralTurmaProps) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!classId) return;

    const q = query(
      collection(db, "posts"),
      where("classId", "==", classId),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      setPosts(newPosts);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `posts (classId: ${classId})`);
      setIsLoading(false);
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
        const storageRef = ref(storage, `posts/${classId}/${Date.now()}_${imageFile.name}`);
        const uploadResult = await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(uploadResult.ref);
      }

      await addDoc(collection(db, "posts"), {
        authorId: currentUser.id,
        authorName: currentUser.artisticName || currentUser.name,
        classId,
        content: content.trim(),
        imageUrl,
        likes: [],
        timestamp: serverTimestamp()
      });

      setContent("");
      removeImage();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "posts");
    } finally {
      setIsPosting(false);
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
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden group hover:shadow-md transition-all"
              >
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-pro-teal/5 flex items-center justify-center text-pro-teal">
                      <UserIcon size={20} />
                    </div>
                    <div>
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
                        <ThumbsUp 
                          size={18} 
                          className={post.likes?.includes(currentUser?.id || "") ? 'fill-current' : ''} 
                        />
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
                        <Zap 
                          size={18} 
                          className={post.forces?.includes(currentUser?.id || "") ? 'fill-current' : ''} 
                        />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {post.forces?.length || 0} Força{post.forces?.length !== 1 ? 's' : ''}
                      </span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
