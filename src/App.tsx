/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import { 
  Drama, 
  LogIn, 
  UserPlus, 
  Users, 
  Presentation, 
  LogOut, 
  ChevronDown,
  UserCircle,
  Calendar,
  Eye,
  Pencil,
  Trash2,
  BookOpen,
  Lock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  LineChart as LineChartIcon,
  ChevronRight,
  ArrowLeft,
  HelpCircle,
  X
} from "lucide-react";
import { useState, FormEvent, useRef, ChangeEvent, useCallback, useEffect, useMemo } from "react";
import Cropper from 'react-easy-crop';
import getCroppedImg from "./lib/cropUtils";
import { 
  ADULT_COURSE_CRITERIA, 
  PROFESSIONAL_COURSE_CRITERIA, 
  GRADE_LEGEND,
  PROFESSIONAL_CRITERIA_BASE,
  PROFESSIONAL_CRITERIA_MONTAGEM,
  ADULT_CRITERIA
} from "./constants";
import { auth, db } from "./lib/firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updatePassword,
  sendPasswordResetEmail,
  onAuthStateChanged, 
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  query,
  where,
  getDoc,
  getDocs,
  getDocFromServer,
  orderBy,
  Timestamp
} from "firebase/firestore";
import { handleFirestoreError, OperationType } from "./lib/firestoreErrorHandler";
import { analyzePedagogicalFeedback } from "./services/geminiService";
import { THEME } from "./theme";
import { BADGES } from "./constants/badges";
import { UserRole, User, Class, Diary, Evaluation, UserBadge } from "./types";
import { Logo, LoadingScreen, DetailItem, BackButton } from "./components/CommonComponents";
import { LoginView } from "./views/LoginView";
import { GestorDashboard } from "./views/GestorDashboard";
import { ProfessorDashboard } from "./views/ProfessorDashboard";
import { StudentDashboard } from "./views/StudentDashboard";
import { UsersListView } from "./views/UsersListView";
import { UserDetailsView } from "./views/UserDetailsView";
import { CreateClassView } from "./views/CreateClassView";
import { ClassesListView } from "./views/ClassesListView";
import { ClassDetailsView } from "./views/ClassDetailsView";
import { CreateAnnouncementView } from "./views/CreateAnnouncementView";
import { RegisterEditUserView } from "./views/RegisterEditUserView";
import { SelfAssessmentView } from "./components/SelfAssessmentView";
import { EvolutionView } from "./components/EvolutionView";
import { EvolutionChartsView } from "./components/EvolutionChartsView";
import { ProfessorDiaryView } from "./views/ProfessorDiaryView";
import { StudentDiaryFormView } from "./views/StudentDiaryFormView";
import { ManageDiariesView } from "./views/ManageDiariesView";
import { AgendaEventos } from "./components/AgendaEventos";

export default function App() {
  const [isAppLoading, setIsAppLoading] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Connection validation
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 2;

    async function testConnection() {
      try {
        // Use a simpler getDoc with a shorter timeout if possible, 
        // but getDocFromServer is more definitive for real connection
        await getDocFromServer(doc(db, 'system', 'connection_test'));
        setConnectionError(null);
      } catch (error: any) {
        console.error("Firebase Connection Test Failed:", error);
        
        const isRetryable = error.message?.includes('internal') || 
                          error.message?.includes('offline') || 
                          error.code === 'unavailable' ||
                          error.code === 'deadline-exceeded';

        if (isRetryable && retryCount < maxRetries) {
          retryCount++;
          // Increase delay between retries
          setTimeout(testConnection, 3000 * retryCount);
          return;
        }

        const errMessage = error.message || "";
        const errCode = error.code || "";
        const isPermissionError = errCode === 'permission-denied' || 
                                 errMessage.toLowerCase().includes('permission') ||
                                 errMessage.toLowerCase().includes('insufficient');

        if (error.message?.includes('offline') || error.code === 'unavailable' || error.code === 'failed-precondition') {
          setConnectionError("Aguardando conexão com o Firebase... (Verifique se o Firestore está ativo no Console do Firebase)");
        } else if (isPermissionError) {
          // Permissions are fine for connection verification - it means we reached the server
          console.log("Firebase connection verified (permission denied on test path - this is OK)");
          setConnectionError(null);
        } else if (error.message?.includes('internal')) {
          setConnectionError("O Firebase está inicializando. Tente recarregar a página em alguns instantes.");
        } else {
          setConnectionError(`Erro de Conexão: ${error.message || error.code}`);
        }
      }
    }
    testConnection();
  }, []);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [_view, _setView] = useState<"login" | "dashboard" | "register" | "edit_self" | "edit_user" | "first_login" | "users_list" | "user_details" | "create_class" | "classes_list" | "class_details" | "edit_class" | "self_assessment" | "evolution" | "professor_diary" | "manage_diaries" | "student_diary_form" | "first_password_setup" | "school_agenda">("login");
  
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedDiaryStudentId, setSelectedDiaryStudentId] = useState<string | null>(null);

  const isPopStateNavigation = useRef(false);

  const handleResetUserForm = useCallback(() => {
    setFormData({
      name: "",
      artisticName: "",
      email: "",
      phone: "",
      address: "",
      cpf: "",
      bank: "",
      bankAgency: "",
      bankAccount: "",
      pixKey: "",
      cnpj: "",
      initialPassword: ""
    });
    setPhotoPreview(null);
    setSelectedUserClasses([]);
  }, []);

  // Sync state with browser history
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state) {
        isPopStateNavigation.current = true;
        _setView(event.state.view || "login");
        setSelectedUserId(event.state.selectedUserId || null);
        setSelectedClassId(event.state.selectedClassId || null);
        setSelectedDiaryStudentId(event.state.selectedDiaryStudentId || null);
      }
    };

    window.addEventListener('popstate', handlePopState);

    // Initial state
    if (!window.history.state) {
      window.history.replaceState({ 
        view: _view, 
        selectedUserId, 
        selectedClassId, 
        selectedDiaryStudentId 
      }, "");
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (isPopStateNavigation.current) {
      isPopStateNavigation.current = false;
      return;
    }

    // Don't push if already at this state
    const currentState = window.history.state;
    if (currentState && 
        currentState.view === _view && 
        currentState.selectedUserId === selectedUserId &&
        currentState.selectedClassId === selectedClassId &&
        currentState.selectedDiaryStudentId === selectedDiaryStudentId) {
      return;
    }

    window.history.pushState({ 
      view: _view, 
      selectedUserId, 
      selectedClassId, 
      selectedDiaryStudentId 
    }, "");
  }, [_view, selectedUserId, selectedClassId, selectedDiaryStudentId]);

  // Custom setView with loading transition
  const setView = useCallback((newView: any) => {
    setIsAppLoading(true);
    setTimeout(() => {
      _setView(newView);
      setTimeout(() => {
        setIsAppLoading(false);
      }, 600);
    }, 1000);
  }, []);

  const view = _view;
  const [role, setRole] = useState<UserRole | null>(null);
  
  // Data States
  const [users, setUsers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [diaries, setDiaries] = useState<any[]>([]);
  const [pedagogicalRequests, setPedagogicalRequests] = useState<any[]>([]);
  const [evolutionRecords, setEvolutionRecords] = useState<any[]>([]);
  const [currentUserBadges, setCurrentUserBadges] = useState<UserBadge[]>([]);
  const [selectedUserBadges, setSelectedUserBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [gestorError, setGestorError] = useState<string | null>(null);

  // Diary States
  const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(new Set());
  const [analyticsClassId, setAnalyticsClassId] = useState<string>("");
  const [diaryFilterMonth, setDiaryFilterMonth] = useState(new Date().getMonth() + 1);
  const [diaryFilterYear, setDiaryFilterYear] = useState(new Date().getFullYear());
  const [diaryFormData, setDiaryFormData] = useState({
    presences: 0,
    absences: 0,
    frequencyObs: "",
    weeklyAttendance: {} as Record<string, any>,
    grades: {} as Record<string, number>,
    criteriaObs: {} as Record<string, string>,
    generalPedagogicalObs: ""
  });
  
  // Password Change States
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwdNew, setPwdNew] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const [gestorResettingUid, setGestorResettingUid] = useState<string | null>(null);
  const [gestorNewPwd, setGestorNewPwd] = useState("");
  const [gestorResetError, setGestorResetError] = useState("");

  // States for first password setup
  const [firstPwdEmail, setFirstPwdEmail] = useState("");
  const [firstPwdNew, setFirstPwdNew] = useState("");
  const [firstPwdConfirm, setFirstPwdConfirm] = useState("");
  const [firstPwdError, setFirstPwdError] = useState("");

  const handleFirstPasswordSetup = async (e: FormEvent) => {
    e.preventDefault();
    setFirstPwdError("");

    if (firstPwdNew.length < 6) {
      setFirstPwdError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (firstPwdNew !== firstPwdConfirm) {
      setFirstPwdError("As senhas não coincidem.");
      return;
    }

    setIsAppLoading(true);
    try {
      // 1. Check if email exists in Firestore
      const q = query(collection(db, "usuarios"), where("email", "==", firstPwdEmail.trim().toLowerCase()));
      const snap = await getDocs(q);

      if (snap.empty) {
        setFirstPwdError("Este e-mail não está cadastrado no sistema. Por favor, solicite seu acesso.");
        return;
      }

      const userData = snap.docs[0].data();

      // 2. Try to create Auth user
      try {
        const userCred = await createUserWithEmailAndPassword(auth, firstPwdEmail.trim().toLowerCase(), firstPwdNew);
        const user = userCred.user;

        // 3. Update Firestore with UID if it's different (link them)
        // If the manager registered with email, we update the existing doc to have the UID as the ID
        // Or if the doc ID is already the same as UID (not possible if not created in Auth yet)
        
        // Let's migrate the doc to use UID if it's currently using a random ID
        const oldDocId = snap.docs[0].id;
        if (oldDocId !== user.uid) {
          await setDoc(doc(db, "usuarios", user.uid), {
            ...userData,
            passwordChanged: true,
            updatedAt: serverTimestamp()
          });

          // Reference Migration: Update all references to oldDocId with user.uid
          try {
            // 1. Update Classes (studentIds array and teacherId)
            const classesQuery = query(collection(db, "classes"));
            const classesSnap = await getDocs(classesQuery);
            for (const classDoc of classesSnap.docs) {
              const classData = classDoc.data();
              let updated = false;
              let studentIds = classData.studentIds || [];
              let teacherId = classData.teacherId;

              if (studentIds.includes(oldDocId)) {
                studentIds = studentIds.map((id: string) => id === oldDocId ? user.uid : id);
                updated = true;
              }

              if (teacherId === oldDocId) {
                teacherId = user.uid;
                updated = true;
              }

              if (updated) {
                await updateDoc(doc(db, "classes", classDoc.id), { studentIds, teacherId });
              }
            }

            // 2. Update Evaluations
            const evaluationsQuery = query(collection(db, "autoavaliacoes"), where("studentId", "==", oldDocId));
            const evaluationsSnap = await getDocs(evaluationsQuery);
            for (const evalDoc of evaluationsSnap.docs) {
              await updateDoc(doc(db, "autoavaliacoes", evalDoc.id), { studentId: user.uid });
            }

            // 3. Update Diaries
            const diariesQueryStudent = query(collection(db, "diarios_classe"), where("studentId", "==", oldDocId));
            const diariesSnapStudent = await getDocs(diariesQueryStudent);
            for (const diaryDoc of diariesSnapStudent.docs) {
              await updateDoc(doc(db, "diarios_classe", diaryDoc.id), { studentId: user.uid });
            }
            const diariesQueryTeacher = query(collection(db, "diarios_classe"), where("teacherId", "==", oldDocId));
            const diariesSnapTeacher = await getDocs(diariesQueryTeacher);
            for (const diaryDoc of diariesSnapTeacher.docs) {
              await updateDoc(doc(db, "diarios_classe", diaryDoc.id), { teacherId: user.uid });
            }

            // 4. Update Evolution Records
            const evolutionsQueryStudent = query(collection(db, "evolucao"), where("studentId", "==", oldDocId));
            const evolutionsSnapStudent = await getDocs(evolutionsQueryStudent);
            for (const evDoc of evolutionsSnapStudent.docs) {
              await updateDoc(doc(db, "evolucao", evDoc.id), { studentId: user.uid });
            }
            const evolutionsQueryTeacher = query(collection(db, "evolucao"), where("teacherId", "==", oldDocId));
            const evolutionsSnapTeacher = await getDocs(evolutionsQueryTeacher);
            for (const evDoc of evolutionsSnapTeacher.docs) {
              await updateDoc(doc(db, "evolucao", evDoc.id), { teacherId: user.uid });
            }

          } catch (refErr) {
            console.error("Error migrating references:", refErr);
          }

          // Finally delete the old user document
          await deleteDoc(doc(db, "usuarios", oldDocId));
        } else {
          await updateDoc(doc(db, "usuarios", user.uid), {
            passwordChanged: true,
            updatedAt: serverTimestamp()
          });
        }

        showNotification("Senha cadastrada com sucesso! Bem-vindo ao sistema.", "Sucesso");
        // onAuthStateChanged will handle the view change
      } catch (authErr: any) {
        console.error("Auth creation error:", authErr);
        if (authErr.code === "auth/email-already-in-use") {
          setFirstPwdError("Este e-mail já possui uma conta ativa. Tente fazer login ou redefinir sua senha.");
        } else {
          setFirstPwdError(`Erro ao criar conta: ${authErr.message}`);
        }
      }
    } catch (err: any) {
      console.error("Setup error:", err);
      setFirstPwdError(`Erro no processo: ${err.message}`);
    } finally {
      setIsAppLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    
    if (pwdNew.length < 6) {
      setPasswordError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    
    if (pwdNew !== pwdConfirm) {
      setPasswordError("As senhas não coincidem.");
      return;
    }

    if (!auth.currentUser) {
      setPasswordError("Sessão expirada. Por favor, faça login novamente.");
      return;
    }

    setIsAppLoading(true);
    try {
      await updatePassword(auth.currentUser, pwdNew);
      setShowPasswordModal(false);
      setPwdNew("");
      setPwdConfirm("");
      showNotification("Senha alterada com sucesso!", "Sucesso");
    } catch (err: any) {
      console.error("Error updating password:", err);
      if (err.code === "auth/requires-recent-login") {
        setPasswordError("Para sua segurança, esta operação requer um login recente. Por favor, saia e entre novamente antes de alterar a senha.");
      } else {
        setPasswordError(`Erro ao alterar senha: ${err.message}`);
      }
    } finally {
      setIsAppLoading(false);
      setPasswordLoading(false);
    }
  };

  const handleGestorPasswordReset = async (e: FormEvent) => {
    e.preventDefault();
    setGestorResetError("");

    if (gestorNewPwd.length < 6) {
      setGestorResetError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setIsAppLoading(true);
    try {
      const response = await fetch("/api/admin/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: gestorResettingUid,
          newPassword: gestorNewPwd,
          adminUid: currentUser.uid
        })
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response received:", text);
        throw new Error(`Erro no servidor (${response.status}): O servidor não retornou JSON. Verifique as configurações.`);
      }

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update password");

      showNotification("Senha alterada com sucesso pelo Gestor.", "Sucesso");
      setGestorResettingUid(null);
      setGestorNewPwd("");
    } catch (err: any) {
      console.error("Gestor Reset Error:", err);
      setGestorResetError(err.message);
    } finally {
      setIsAppLoading(false);
    }
  };

  const handleAdminResetPassword = async (userEmail: string) => {
    if (!userEmail) return;
    setIsAppLoading(true);
    try {
      await sendPasswordResetEmail(auth, userEmail.trim().toLowerCase());
      showNotification(`Link de redefinição enviado para ${userEmail}`, "Sucesso");
    } catch (err: any) {
      showNotification("Erro: " + err.message, "Erro");
    } finally {
      setIsAppLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          setGestorError(null);
          
          let userDocData: any = null;
          let userRole: any = null;

          try {
            const userRef = doc(db, "usuarios", user.uid);
            // Explicitly use getDocFromServer to ensure we are getting fresh data and respect auth
            const userDoc = await getDoc(userRef);
            if (userDoc.exists()) {
              userDocData = userDoc.data();
              userRole = userDocData?.role;
            } else if (user.email) {
              const q = query(collection(db, "usuarios"), where("email", "==", user.email.toLowerCase()));
              const querySnapshot = await getDocs(q);
              if (!querySnapshot.empty) {
                const oldDoc = querySnapshot.docs[0];
                const oldDocId = oldDoc.id;
                userDocData = oldDoc.data();
                userRole = userDocData?.role;
                
                // MIGRATION START
                console.log(`Migrating user ${user.email} from ${oldDocId} to ${user.uid}`);
                
                await setDoc(doc(db, "usuarios", user.uid), {
                  ...userDocData,
                  migratedFrom: oldDocId,
                  updatedAt: serverTimestamp()
                });

                // Migrate References
                try {
                  // 1. Classes
                  const classesSnap = await getDocs(collection(db, "classes"));
                  for (const classDoc of classesSnap.docs) {
                    const cData = classDoc.data();
                    let updated = false;
                    let studentIds = [...(cData.studentIds || [])];
                    let teacherId = cData.teacherId;

                    if (studentIds.includes(oldDocId)) {
                      studentIds = studentIds.map((id: string) => id === oldDocId ? user.uid : id);
                      updated = true;
                    }
                    if (teacherId === oldDocId) {
                      teacherId = user.uid;
                      updated = true;
                    }
                    if (updated) {
                      await updateDoc(doc(db, "classes", classDoc.id), { studentIds, teacherId });
                    }
                  }

                  // 2. Evaluations
                  const evalSnap = await getDocs(query(collection(db, "autoavaliacoes"), where("studentId", "==", oldDocId)));
                  for (const d of evalSnap.docs) await updateDoc(doc(db, "autoavaliacoes", d.id), { studentId: user.uid });

                  // 3. Diaries
                  const diarySnapS = await getDocs(query(collection(db, "diarios_classe"), where("studentId", "==", oldDocId)));
                  for (const d of diarySnapS.docs) await updateDoc(doc(db, "diarios_classe", d.id), { studentId: user.uid });
                  const diarySnapT = await getDocs(query(collection(db, "diarios_classe"), where("teacherId", "==", oldDocId)));
                  for (const d of diarySnapT.docs) await updateDoc(doc(db, "diarios_classe", d.id), { teacherId: user.uid });

                  // 4. Evolution
                  const evoSnapS = await getDocs(query(collection(db, "evolucao"), where("studentId", "==", oldDocId)));
                  for (const d of evoSnapS.docs) await updateDoc(doc(db, "evolucao", d.id), { studentId: user.uid });
                  const evoSnapT = await getDocs(query(collection(db, "evolucao"), where("teacherId", "==", oldDocId)));
                  for (const d of evoSnapT.docs) await updateDoc(doc(db, "evolucao", d.id), { teacherId: user.uid });

                  // 5. Announcements
                  const avisosSnap = await getDocs(collection(db, "avisos"));
                  for (const avisoDoc of avisosSnap.docs) {
                    const aData = avisoDoc.data();
                    if (aData.targetUserIds && aData.targetUserIds.includes(oldDocId)) {
                      const updatedIds = aData.targetUserIds.map((id: string) => id === oldDocId ? user.uid : id);
                      await updateDoc(doc(db, "avisos", avisoDoc.id), { targetUserIds: updatedIds });
                    }
                  }

                  // Mark old document as migrated
                  await updateDoc(doc(db, "usuarios", oldDocId), { 
                    migratedTo: user.uid, 
                    inactive: true,
                    updatedAt: serverTimestamp() 
                  });
                  
                  console.log("Migration completed successfully for", user.email);
                } catch (migrateErr) {
                  console.error("Migration references error:", migrateErr);
                }
                // MIGRATION END
              }
            }
          } catch (docErr: any) {
            console.error("Firestore getDoc Error:", docErr);
          }
          
          if (!userRole && (user.email === 'intervalocasa@gmail.com')) {
            userRole = "Gestor";
          }

          if (userRole) {
            setCurrentUser(user);
            setRole(userRole as UserRole);
            // If the user is logged in, redirect to dashboard unless they are already in a protected view
            if (view === "login" || view === "first_password_setup") {
              setView("dashboard");
            }
          } else {
            // User is authenticated in Auth but has no profile in Firestore
            setCurrentUser(null);
            setRole(null);
            if (view !== "login" && view !== "register" && view !== "first_password_setup") {
              setView("login");
            }
          }
      } else {
        // User is logged out
        setCurrentUser(null);
        setRole(null);
        if (view !== "login" && view !== "register" && view !== "first_password_setup") {
          setView("login");
        }
      }
      setLoading(false);
      } catch (authErr: any) {
        console.error("Auth Observer Error:", authErr);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [setView]); // Only run on mount

  const [viewingEvaluation, setViewingEvaluation] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const lastAvisoIdRef = useRef<string | null>(null);

  // Request Notification Permission
  useEffect(() => {
    if (currentUser && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [currentUser]);

  const triggerNotification = useCallback((aviso: any, currentUsers: any[], currentUserId: string | undefined) => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    // Filter logic repeated here for the notification trigger
    const userRole = currentUsers.find(u => u.id === currentUserId)?.role;
    let shouldNotify = false;

    if (userRole === "Gestor") shouldNotify = true;
    else if (aviso.targetSpecificUsers) {
      shouldNotify = aviso.targetUserIds?.includes(currentUserId);
    } else {
      if (aviso.target === "Todos") shouldNotify = true;
      if (aviso.target === "Alunos" && userRole === "Aluno") shouldNotify = true;
      if (aviso.target === "Professores" && userRole === "Professor") shouldNotify = true;
    }

    if (shouldNotify) {
      new Notification("Novo Aviso: " + aviso.title, {
        body: aviso.content,
        icon: "/logo.png"
      });
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribeUsers = onSnapshot(collection(db, "usuarios"), (snapshot) => {
      const sortedUsers = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => (a.name || "").localeCompare(b.name || "", 'pt-BR'));
      setUsers(sortedUsers);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, "usuarios");
    });

    const unsubscribeClasses = onSnapshot(collection(db, "classes"), (snapshot) => {
      setClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, "classes");
    });

    const unsubscribeEvals = onSnapshot(collection(db, "autoavaliacoes"), (snapshot) => {
      setEvaluations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, "autoavaliacoes");
    });

    const unsubscribeDiaries = onSnapshot(collection(db, "diarios_classe"), (snapshot) => {
      setDiaries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, "diarios_classe");
    });

    const unsubscribePedagogical = onSnapshot(collection(db, "pedagogical-requests"), (snapshot) => {
      setPedagogicalRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, "pedagogical-requests");
    });

    const unsubscribeEvolutions = onSnapshot(collection(db, "evolucao"), (snapshot) => {
      setEvolutionRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, "evolucao");
    });

    const unsubscribeAnnouncements = onSnapshot(query(collection(db, "avisos"), orderBy("createdAt", "desc")), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAnnouncements(data);

      // Check for new announcement to notify
      if (data.length > 0) {
        const newest = data[0];
        // Only notify if we already had a "last seen" ID and it changed (new post)
        if (lastAvisoIdRef.current && lastAvisoIdRef.current !== newest.id) {
          // Use latest state via refs or pass current data if needed
          // For safety and to avoid deps, we can skip notification on the very first load
          triggerNotification(newest, users, currentUser?.uid);
        }
        lastAvisoIdRef.current = newest.id;
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, "avisos");
    });

    return () => {
      unsubscribeUsers();
      unsubscribeClasses();
      unsubscribeEvals();
      unsubscribeDiaries();
      unsubscribePedagogical();
      unsubscribeEvolutions();
      unsubscribeAnnouncements();
    };
  }, [currentUser?.uid]); // Only re-run if the user ID changes

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const [selectedUserClasses, setSelectedUserClasses] = useState<string[]>([]);
  const [selectedEnrollmentDates, setSelectedEnrollmentDates] = useState<Record<string, string>>({});
  const [enrollmentModalClassId, setEnrollmentModalClassId] = useState<string | null>(null);
  const [enrollmentModalDate, setEnrollmentModalDate] = useState("");

  const [editEnrollmentInfo, setEditEnrollmentInfo] = useState<{classId: string, studentId: string, date: string} | null>(null);

  const handleUpdateEnrollmentDate = async (classId: string, studentId: string, newDate: string) => {
    setIsAppLoading(true);
    try {
      const cls = classes.find(c => c.id === classId);
      if (!cls) return;
      
      const updatedEnrollmentDates = { ...(cls.enrollmentDates || {}) };
      updatedEnrollmentDates[studentId] = newDate;
      
      await updateDoc(doc(db, "classes", classId), {
        enrollmentDates: updatedEnrollmentDates,
        updatedAt: serverTimestamp()
      });
      showNotification("Data de matrícula atualizada!", "Sucesso");
    } catch (err: any) {
      showNotification("Erro ao atualizar data: " + err.message, "Erro");
    } finally {
      setIsAppLoading(false);
    }
  };

  const [assessmentMonth, setAssessmentMonth] = useState(new Date().getMonth() + 1);
  const [assessmentYear, setAssessmentYear] = useState(new Date().getFullYear());
  
  const [assessmentForm, setAssessmentForm] = useState<{
    classId: string;
    notes: { [key: string]: number };
    openAnswers: { [key: string]: string };
  }>({
    classId: "",
    notes: {},
    openAnswers: {}
  });

  const filteredAnnouncements = announcements.filter(aviso => {
    // 1. Check schedule
    if (aviso.scheduledFor) {
      const scheduleDate = aviso.scheduledFor.toDate ? aviso.scheduledFor.toDate() : new Date(aviso.scheduledFor);
      if (scheduleDate > new Date()) return false;
    }

    // 2. Check target for current user role
    const userRole = users.find(u => u.id === currentUser?.uid)?.role;
    if (userRole === "Gestor") return true; // Gestor sees everything
    
    // 3. Check if it's targeted for specific users
    if (aviso.targetSpecificUsers) {
      return aviso.targetUserIds?.includes(currentUser?.uid);
    }
    
    if (aviso.target === "Todos") return true;
    if (aviso.target === "Alunos" && userRole === "Aluno") return true;
    if (aviso.target === "Professores" && userRole === "Professor") return true;

    return false;
  });

  const [helpLevelModal, setHelpLevelModal] = useState<{title: string, detail: string, motivation: string} | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const closeConfirmModal = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));

  // Badge Logic
  useEffect(() => {
    if (!currentUser) {
      setCurrentUserBadges([]);
      return;
    }
    const q = collection(db, "usuarios", currentUser.uid, "userBadges");
    const unsub = onSnapshot(q, (snapshot) => {
      setCurrentUserBadges(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserBadge)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `usuarios/${currentUser.uid}/userBadges`);
    });
    return unsub;
  }, [currentUser]);

  useEffect(() => {
    if (!selectedUserId) {
      setSelectedUserBadges([]);
      return;
    }
    const q = collection(db, "usuarios", selectedUserId, "userBadges");
    const unsub = onSnapshot(q, (snapshot) => {
      setSelectedUserBadges(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserBadge)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `usuarios/${selectedUserId}/userBadges`);
    });
    return unsub;
  }, [selectedUserId]);

  const handleAwardBadge = async (studentId: string, badgeDef: any, customMessage?: string, forceUniqueKey?: string) => {
    try {
      const badgeData = {
        badgeId: badgeDef.badgeId,
        name: badgeDef.name,
        icon: badgeDef.badgeId, 
        description: badgeDef.description,
        dateReceived: serverTimestamp(),
        message: customMessage || badgeDef.defaultMessage
      };
      
      // Embaixador da Arte is strictly unique (one doc per student)
      // Others use unique keys to allow multiple awards (counts)
      const docId = badgeDef.badgeId === 'embaixador-da-arte' 
        ? badgeDef.badgeId 
        : (forceUniqueKey || `${badgeDef.badgeId}_${Date.now()}`);

      await setDoc(doc(db, "usuarios", studentId, "userBadges", docId), badgeData);

      // Create an announcement for the badge award
      const studentData = users.find(u => u.id === studentId);
      if (studentData) {
        const announcementData = {
          title: `🏆 CONQUISTA: ${badgeDef.name.toUpperCase()}`,
          content: customMessage || badgeDef.defaultMessage,
          target: "Alunos",
          targetSpecificUsers: true,
          targetUserIds: [studentId],
          createdBy: currentUser?.uid || "System",
          createdAt: serverTimestamp()
        };
        
        // Use a predictable ID for automated badges to avoid duplicate announcements if re-awarded
        const announcementId = forceUniqueKey ? `badge_${studentId}_${forceUniqueKey}` : null;
        if (announcementId) {
          await setDoc(doc(db, "avisos", announcementId), announcementData);
        } else {
          await addDoc(collection(db, "avisos"), announcementData);
        }
      }

      if (!forceUniqueKey) {
        showNotification(`Conquista "${badgeDef.name}" atribuída com sucesso!`, "Sucesso");
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `usuarios/${studentId}/userBadges/${badgeDef.badgeId}`);
    }
  };

  const handleRemoveBadge = async (studentId: string, badgeId: string) => {
    try {
      await deleteDoc(doc(db, "usuarios", studentId, "userBadges", badgeId));
      showNotification("Conquista removida com sucesso!", "Sucesso");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `usuarios/${studentId}/userBadges/${badgeId}`);
    }
  };

  // Custom Notification Modal State
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "success" | "warning" | "error";
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "success",
  });

  const showNotification = (message: string, title: string = "Aviso", type: "success" | "warning" | "error" = "success") => {
    setNotification({ isOpen: true, title, message, type });
  };

  const handleDiarySubmit = async (status: "rascunho" | "concluido") => {
    if (!currentUser || !selectedClassId || !selectedDiaryStudentId) {
      console.error("Missing context for diary submit", { currentUser: !!currentUser, selectedClassId, selectedDiaryStudentId });
      return;
    }

    const teacherData = users.find(u => u.id === currentUser.uid);
    const studentData = users.find(u => u.id === selectedDiaryStudentId);
    const selectedClass = classes.find(c => c.id === selectedClassId);

    if (!selectedClass || !studentData) {
      console.error("Class or student not found", { selectedClass: !!selectedClass, studentData: !!studentData });
      return;
    }

    // Validation for "concluido"
    if (status === "concluido") {
      const isProfessional = selectedClass.type.includes("Profissional") || selectedClass.type.includes("Montagem");
      const criteriaList = isProfessional 
        ? PROFESSIONAL_COURSE_CRITERIA 
        : ADULT_COURSE_CRITERIA;
      
      const missingGrades = criteriaList.filter(c => diaryFormData.grades[c.id] === undefined);
      if (missingGrades.length > 0) {
        showNotification("Por favor, preencha as notas de todos os critérios antes de concluir.", "Aviso", "warning");
        return;
      }

      if (diaryFormData.presences === undefined || diaryFormData.absences === undefined) {
        showNotification("Por favor, informe a quantidade de presenças e faltas.", "Aviso", "warning");
        return;
      }
    }

    setIsAppLoading(true);
    try {
      const existingDiary = diaries.find(d => 
        d.studentId === selectedDiaryStudentId && 
        d.classId === selectedClassId && 
        d.month === diaryFilterMonth && 
        d.year === diaryFilterYear
      );

      const gradesCount = Object.keys(diaryFormData.grades).length;
      const averageGrade = gradesCount > 0 
        ? (Object.values(diaryFormData.grades) as any[]).reduce((acc: number, val: any) => acc + (Number(val) || 0), 0) / gradesCount
        : 0;

      const diaryData = {
        studentId: selectedDiaryStudentId,
        studentName: studentData.artisticName || studentData.name,
        studentEmail: studentData.email || "",
        classId: selectedClassId,
        className: selectedClass.code,
        classType: selectedClass.type,
        teacherId: currentUser.uid,
        teacherName: teacherData?.artisticName || teacherData?.name || "Professor",
        month: diaryFilterMonth,
        year: diaryFilterYear,
        presences: Number(diaryFormData.presences || 0),
        absences: Number(diaryFormData.absences || 0),
        frequencyObs: diaryFormData.frequencyObs || "",
        weeklyAttendance: diaryFormData.weeklyAttendance || {},
        grades: diaryFormData.grades,
        criteriaObs: diaryFormData.criteriaObs || {},
        generalPedagogicalObs: diaryFormData.generalPedagogicalObs || "",
        averageGrade,
        status,
        updatedAt: serverTimestamp()
      };

      if (existingDiary) {
        await updateDoc(doc(db, "diarios_classe", existingDiary.id), diaryData);
      } else {
        await addDoc(collection(db, "diarios_classe"), {
          ...diaryData,
          createdAt: serverTimestamp()
        });
      }

      // Check for weekly comments to trigger notifications
      const weeklyComments = Object.entries(diaryFormData.weeklyAttendance || {}).filter(([_, v]: any) => v.comment?.trim());
      const oldWeeklyComments = Object.entries(existingDiary?.weeklyAttendance || {}).filter(([_, v]: any) => v.comment?.trim());
      
      // If there's a new comment or a comment changed
      for (const [weekNum, data] of weeklyComments) {
        const oldData = (existingDiary?.weeklyAttendance || {})[weekNum];
        if (!oldData || oldData.comment !== data.comment) {
          // Trigger notification via Announcement
          await addDoc(collection(db, "avisos"), {
            title: `Novo comentário de frequência - ${selectedClass.code}`,
            content: `Seu professor comentou na sua frequência da ${weekNum.replace('week', 'Semana ')}: "${data.comment}"`,
            target: "Alunos",
            targetSpecificUsers: true,
            targetUserIds: [selectedDiaryStudentId],
            createdBy: currentUser.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      }

      showNotification(status === "concluido" ? "Diário de Classe concluído com sucesso." : "Diário de Classe salvo com sucesso.", "Sucesso");
      
      if (status === "concluido") {
        const uniqueCycleKey = `_${diaryFilterMonth}_${diaryFilterYear}_${selectedClassId}`;
        
        // 1. Check for Presença VIP (100% frequency)
        if (Number(diaryFormData.absences || 0) === 0 && Number(diaryFormData.presences || 0) > 0) {
          const vipBadge = BADGES.find(b => b.badgeId === 'presenca-vip');
          if (vipBadge) {
            await handleAwardBadge(selectedDiaryStudentId, vipBadge, undefined, `presenca-vip${uniqueCycleKey}`);
          }
        }

        // 2. Check for Crítico de Arte (Evaluated all attended classes)
        // We query feedbacks for this student and class in the given month
        const startOfMonth = new Date(diaryFilterYear, diaryFilterMonth - 1, 1);
        const endOfMonth = new Date(diaryFilterYear, diaryFilterMonth, 0, 23, 59, 59);

        const feedbackQuery = query(
          collection(db, "feedbacks-aulas"),
          where("studentId", "==", selectedDiaryStudentId),
          where("classId", "==", selectedClassId),
          where("timestamp", ">=", Timestamp.fromDate(startOfMonth)),
          where("timestamp", "<=", Timestamp.fromDate(endOfMonth))
        );
        
        const feedbackSnap = await getDocs(feedbackQuery);
        const feedbackCount = feedbackSnap.size;

        if (feedbackCount >= Number(diaryFormData.presences || 0) && Number(diaryFormData.presences || 0) > 0) {
          const criticoBadge = BADGES.find(b => b.badgeId === 'critico-de-arte');
          if (criticoBadge) {
            await handleAwardBadge(selectedDiaryStudentId, criticoBadge, undefined, `critico-de-arte${uniqueCycleKey}`);
          }
        }
      }

      setView("professor_diary");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "diarios_classe");
    } finally {
      setIsAppLoading(false);
    }
  };

  const resetDatabase = async () => {
    // Disabled to prevent data loss - only manual cleaning allowed via Firebase Console
    showNotification("O reset automático foi desabilitado por segurança.", "Aviso", "warning");
  };

  const handleExecuteReset = async () => {
    setIsResetModalOpen(false);
  };

  const [classData, setClassData] = useState({
    type: "Curso Livre Adultos",
    code: "",
    weekday: "Segunda-feira",
    time: "19:00",
    startDate: "",
    year: "",
    isActive: true,
    inactivationReason: "",
    teacherId: ""
  });

  const [showInactivationPopup, setShowInactivationPopup] = useState(false);

  // Registration Form State
  const [regType, setRegType] = useState<UserRole>("Aluno");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [filter, setFilter] = useState<UserRole | "Todos">("Todos");
  const filteredUsers = useMemo(() => {
    const list = filter === "Todos" ? users : users.filter(u => u.role === filter);
    return [...list].sort((a, b) => (a.artisticName || a.name || "").localeCompare(b.artisticName || b.name || "", 'pt-BR'));
  }, [users, filter]);

  // Form State for Registration
  const [formData, setFormData] = useState({
    name: "",
    artisticName: "",
    birthDate: "",
    email: "",
    phone: "",
    address: "",
    cpf: "",
    bank: "",
    bankAgency: "",
    bankAccount: "",
    pixKey: "",
    cnpj: "",
    initialPassword: ""
  });

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isCropping, setIsCropping] = useState(false);

  const onCropComplete = useCallback((_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageToCrop(reader.result as string);
        setIsCropping(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const showCroppedImage = useCallback(async () => {
    try {
      if (imageToCrop && croppedAreaPixels) {
        const croppedImage = await getCroppedImg(
          imageToCrop,
          croppedAreaPixels
        );
        setPhotoPreview(croppedImage);
        setIsCropping(false);
        setImageToCrop(null);
      }
    } catch (e) {
      console.error(e);
    }
  }, [imageToCrop, croppedAreaPixels]);

  const handleGoogleLogin = async () => {
    setIsAppLoading(true);
    setError("");
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userRef = doc(db, "usuarios", user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        // Try to find if user was pre-registered by email
        const q = query(collection(db, "usuarios"), where("email", "==", user.email?.toLowerCase()));
        const snap = await getDocs(q);

        if (!snap.empty) {
          const userData = snap.docs[0].data();
          const oldDocId = snap.docs[0].id;

          // Migrate data to UID document
          await setDoc(userRef, {
            ...userData,
            updatedAt: serverTimestamp()
          });

          // Reference Migration
          try {
            // 1. Classes
            const classesQuery = query(collection(db, "classes"));
            const classesSnap = await getDocs(classesQuery);
            for (const classDoc of classesSnap.docs) {
              const classData = classDoc.data();
              let updated = false;
              let studentIds = classData.studentIds || [];
              let teacherId = classData.teacherId;

              if (studentIds.includes(oldDocId)) {
                studentIds = studentIds.map((id: string) => id === oldDocId ? user.uid : id);
                updated = true;
              }
              if (teacherId === oldDocId) {
                teacherId = user.uid;
                updated = true;
              }
              if (updated) {
                await updateDoc(doc(db, "classes", classDoc.id), { studentIds, teacherId });
              }
            }

            // 2. Evaluations
            const evaluationsQuery = query(collection(db, "autoavaliacoes"), where("studentId", "==", oldDocId));
            const evaluationsSnap = await getDocs(evaluationsQuery);
            for (const evalDoc of evaluationsSnap.docs) {
              await updateDoc(doc(db, "autoavaliacoes", evalDoc.id), { studentId: user.uid });
            }

            // 3. Diaries
            const diariesQueryStudent = query(collection(db, "diarios_classe"), where("studentId", "==", oldDocId));
            const diariesSnapStudent = await getDocs(diariesQueryStudent);
            for (const diaryDoc of diariesSnapStudent.docs) {
              await updateDoc(doc(db, "diarios_classe", diaryDoc.id), { studentId: user.uid });
            }
            const diariesQueryTeacher = query(collection(db, "diarios_classe"), where("teacherId", "==", oldDocId));
            const diariesSnapTeacher = await getDocs(diariesQueryTeacher);
            for (const diaryDoc of diariesSnapTeacher.docs) {
              await updateDoc(doc(db, "diarios_classe", diaryDoc.id), { teacherId: user.uid });
            }

            // 4. Evolution
            const evolutionsQueryStudent = query(collection(db, "evolucao"), where("studentId", "==", oldDocId));
            const evolutionsSnapStudent = await getDocs(evolutionsQueryStudent);
            for (const evDoc of evolutionsSnapStudent.docs) {
              await updateDoc(doc(db, "evolucao", evDoc.id), { studentId: user.uid });
            }
            const evolutionsQueryTeacher = query(collection(db, "evolucao"), where("teacherId", "==", oldDocId));
            const evolutionsSnapTeacher = await getDocs(evolutionsQueryTeacher);
            for (const evDoc of evolutionsSnapTeacher.docs) {
              await updateDoc(doc(db, "evolucao", evDoc.id), { teacherId: user.uid });
            }
          } catch (refErr) {
            console.error("Error migrating references in Google Login:", refErr);
          }

          // Mark old doc as migrated
          await updateDoc(doc(db, "usuarios", oldDocId), { 
            migratedTo: user.uid, 
            inactive: true,
            updatedAt: serverTimestamp() 
          });
        } else if (user.email === 'intervalocasa@gmail.com') {
          // New gestor account
          await setDoc(userRef, {
            name: user.displayName || "Gestor Admin",
            artisticName: "Gestor",
            email: user.email.toLowerCase(),
            role: "Gestor", 
            cpf: "admin", 
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp()
          });
        }
      }
    } catch (err: any) {
      console.error("Google login failed:", err);
      if (err.code === "auth/unauthorized-domain") {
        setError("Domínio não autorizado. Adicione os domínios do app no Console do Firebase (Authentication > Settings > Authorized domains).");
      } else {
        setError("Falha na autenticação com Google.");
      }
    } finally {
      setIsAppLoading(false);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setIsAppLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, login.trim().toLowerCase(), password.trim());
    } catch (err: any) {
      setError("Email ou senha incorretos.");
    } finally {
      setIsAppLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsAppLoading(true);
    await signOut(auth);
    setPhotoPreview(null);
    setFormData({
      name: "",
      artisticName: "",
      email: "",
      phone: "",
      address: "",
      cpf: "",
      bank: "",
      bankAgency: "",
      bankAccount: "",
      pixKey: "",
      cnpj: "",
      initialPassword: ""
    });
    _setView("login");
    setIsAppLoading(false);
  };

  const handleForgotPassword = async (email: string) => {
    if (!email) {
      showNotification("Por favor, insira seu e-mail no campo acima.", "Alerta");
      return;
    }
    setIsAppLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      showNotification("Link de recuperação enviado para o seu e-mail!", "Sucesso");
    } catch (err: any) {
      console.error(err);
      let msg = "Erro ao enviar e-mail de recuperação.";
      if (err.code === "auth/user-not-found") msg = "Usuário não encontrado.";
      showNotification(msg, "Erro");
    } finally {
      setIsAppLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsAppLoading(true);
    try {
      const { initialPassword, ...userDataRest } = formData;
      const dataToSave = {
        ...userDataRest,
        role: view === "register" ? regType : (view === "edit_user" ? users.find(u => u.id === selectedUserId)?.role : role),
        email: formData.email.toLowerCase(),
        photo: photoPreview,
        updatedAt: serverTimestamp()
      };

      let studentId = "";

      if (view === "register") {
        const docRef = await addDoc(collection(db, "usuarios"), {
          ...dataToSave,
          createdAt: serverTimestamp()
        });
        studentId = docRef.id;
        showNotification("Usuário cadastrado com sucesso!", "Sucesso");
      } else {
        const targetId = view === "edit_user" ? selectedUserId : currentUser?.uid;
        if (targetId) {
          studentId = targetId;
          await updateDoc(doc(db, "usuarios", targetId), dataToSave);
          showNotification("Cadastro atualizado com sucesso!", "Sucesso");
        }
      }

      // Synchronize Classes
      if (role === "Gestor" && studentId) {
        const userType = view === "register" ? regType : users.find(u => u.id === studentId)?.role;
        for (const c of classes) {
          if (userType === "Professor") {
            if (selectedUserClasses.includes(c.id) && c.teacherId !== studentId) {
              await updateDoc(doc(db, "classes", c.id), { teacherId: studentId });
            } else if (!selectedUserClasses.includes(c.id) && c.teacherId === studentId) {
              await updateDoc(doc(db, "classes", c.id), { teacherId: null });
            }
          } else {
            const isCurrentlyLinked = c.studentIds?.includes(studentId);
            const shouldBeLinked = selectedUserClasses.includes(c.id);
            const enrollmentDate = selectedEnrollmentDates[c.id];

            if (shouldBeLinked) {
              const updatedStudentIds = isCurrentlyLinked ? c.studentIds : [...(c.studentIds || []), studentId];
              const updatedEnrollmentDates = { ...(c.enrollmentDates || {}) };
              if (enrollmentDate) {
                updatedEnrollmentDates[studentId] = enrollmentDate;
              }
              
              await updateDoc(doc(db, "classes", c.id), {
                studentIds: updatedStudentIds,
                enrollmentDates: updatedEnrollmentDates,
                updatedAt: serverTimestamp()
              });
            } else if (isCurrentlyLinked) {
              const updatedEnrollmentDates = { ...(c.enrollmentDates || {}) };
              delete updatedEnrollmentDates[studentId];

              await updateDoc(doc(db, "classes", c.id), {
                studentIds: c.studentIds.filter((id: string) => id !== studentId),
                enrollmentDates: updatedEnrollmentDates,
                updatedAt: serverTimestamp()
              });
            }
          }
        }
      }
      
      setView("dashboard");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "usuarios");
    } finally {
      setIsAppLoading(false);
    }
  };

  const handleAnnouncementSubmit = async (announcementData: any) => {
    if (!currentUser) return;
    setIsAppLoading(true);
    try {
      const { id, ...rest } = announcementData;
      const data = {
        ...rest,
        updatedAt: serverTimestamp(),
        // Convert local datetime to timestamp if it exists
        scheduledFor: announcementData.scheduledFor ? new Date(announcementData.scheduledFor) : null
      };

      if (id) {
        await updateDoc(doc(db, "avisos", id), data);
        showNotification("Aviso atualizado com sucesso!", "Sucesso");
      } else {
        await addDoc(collection(db, "avisos"), {
          ...data,
          createdBy: currentUser.uid,
          createdAt: serverTimestamp()
        });
        showNotification("Aviso publicado com sucesso!", "Sucesso");
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "avisos");
    } finally {
      setIsAppLoading(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    setIsAppLoading(true);
    try {
      await deleteDoc(doc(db, "avisos", id));
      showNotification("Aviso excluído com sucesso!", "Sucesso");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `avisos/${id}`);
    } finally {
      setIsAppLoading(false);
    }
  };

  const handleFirstLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsAppLoading(true);
    try {
      if (currentUser) {
        await updateDoc(doc(db, "usuarios", currentUser.uid), {
          username: newUsername,
          passwordChanged: true,
          updatedAt: serverTimestamp()
        });
      }
      showNotification("Credenciais atualizadas com sucesso!", "Sucesso");
      setView("dashboard");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "usuarios");
    } finally {
      setIsAppLoading(false);
    }
  };

  const handleClassSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsAppLoading(true);
    try {
      await addDoc(collection(db, "classes"), {
        ...classData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      showNotification("Turma criada com sucesso!", "Sucesso");
      setView("dashboard");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "classes");
    } finally {
      setIsAppLoading(false);
    }
  };

  const handleAssessmentSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser || !assessmentForm.classId) return;

    const studentId = currentUser.uid;
    const studentData = users.find(u => u.id === studentId);
    const selectedClass = classes.find(c => c.id === assessmentForm.classId);
    
    if (!selectedClass) return;

    setLoading(true);
    try {
      showNotification("Analisando seu relato pedagógico...", "IA", "success");
      const pedagogicalAnalysis = await analyzePedagogicalFeedback(
        studentData?.name || "Aluno",
        selectedClass.code,
        assessmentForm.openAnswers,
        assessmentForm.notes
      );

      const existingEval = evaluations.find(e => 
        e.studentId === studentId && 
        e.classId === assessmentForm.classId && 
        e.month === assessmentMonth && 
        e.year === assessmentYear
      );

      const evaluationData = {
        studentId,
        studentName: studentData?.name || "Aluno",
        studentEmail: studentData?.email || "",
        classId: assessmentForm.classId,
        classType: selectedClass.type,
        month: assessmentMonth,
        year: assessmentYear,
        notes: assessmentForm.notes,
        openAnswers: assessmentForm.openAnswers,
        pedagogicalAnalysis: pedagogicalAnalysis || null,
        updatedAt: serverTimestamp()
      };

      if (existingEval) {
        await updateDoc(doc(db, "autoavaliacoes", existingEval.id), evaluationData);
        showNotification("Autoanálise atualizada com sucesso!", "Sucesso");
      } else {
        await addDoc(collection(db, "autoavaliacoes"), {
          ...evaluationData,
          createdAt: serverTimestamp()
        });
        showNotification("Autoanálise enviada com sucesso!", "Sucesso");
      }
      setAssessmentForm({ classId: "", notes: {}, openAnswers: {} });
      setView("dashboard");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "autoavaliacoes");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClassSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsAppLoading(true);
    if (!selectedClassId) return;
    try {
      await updateDoc(doc(db, "classes", selectedClassId), {
        ...classData,
        updatedAt: serverTimestamp()
      });
      showNotification("Turma atualizada com sucesso!", "Sucesso");
      setView("classes_list");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "classes");
    } finally {
      setIsAppLoading(false);
    }
  };

  const handleDeleteClass = async () => {
    if (!selectedClassId) return;
    setIsAppLoading(true);
    try {
      await deleteDoc(doc(db, "classes", selectedClassId));
      showNotification("Turma excluída com sucesso!", "Sucesso");
      setView("classes_list");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `classes/${selectedClassId}`);
    } finally {
      setIsAppLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUserId) return;
    setIsAppLoading(true);
    try {
      await deleteDoc(doc(db, "usuarios", selectedUserId));
      showNotification("Usuário excluído com sucesso!", "Sucesso");
      setView("users_list");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `usuarios/${selectedUserId}`);
    } finally {
      setIsAppLoading(false);
    }
  };

  const handleDeleteDiary = async (id: string) => {
    setIsAppLoading(true);
    try {
      await deleteDoc(doc(db, "diarios_classe", id));
      showNotification("Diário excluído com sucesso!", "Sucesso");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `diarios_classe/${id}`);
    } finally {
      setIsAppLoading(false);
    }
  };

  if (connectionError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-6"
        >
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle size={40} />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">Falha na Conexão</h1>
            <p className="text-slate-500 text-sm leading-relaxed">
              {connectionError}
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl text-[10px] text-left font-mono text-slate-400 break-words">
            Verifique se o Firestore está configurado no Console do Firebase e se o domínio está autorizado.
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
          >
            Tentar Novamente
          </button>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Logo className="h-24 w-auto animate-pulse" />
        <div className="flex flex-col items-center">
          <div className="w-48 h-1 bg-slate-200 rounded-full overflow-hidden">
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              className="w-full h-full bg-[#016a86]"
            />
          </div>
          <p className="text-[10px] uppercase font-black text-slate-400 tracking-[0.3em] mt-3">Carregando Portal</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center md:items-stretch md:p-0 p-4 bg-[#f0f2f5] font-sans">
      <AnimatePresence mode="wait">
        {/* Public Views */}
        {view === "login" ? (
          <LoginView 
            login={login} setLogin={setLogin}
            password={password} setPassword={setPassword}
            error={error} gestorError={gestorError} loading={loading}
            handleLogin={handleLogin}
            handleGoogleLogin={handleGoogleLogin}
            handleForgotPassword={() => handleForgotPassword(login)}
            setView={setView}
          />
        ) : view === "first_password_setup" ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-[480px] bg-white rounded-[40px] shadow-theater overflow-hidden border-4 border-white flex flex-col relative"
          >
            <div className="absolute top-4 left-4 z-20">
              <BackButton 
                onClick={() => setView("login")} 
                className="!text-white pointer-events-auto" 
              />
            </div>
            <div className="bg-gradient-to-br from-[#016a86] to-[#004e63] p-12 text-center relative">
              <Logo className="h-20 w-auto mb-4 mx-auto" />
              <h1 className="text-white text-2xl font-black uppercase tracking-tight">Primeiro Acesso</h1>
              <p className="text-teal-50/70 text-[10px] mt-2 uppercase tracking-widest font-bold">Cadastrar Senha</p>
            </div>
            <div className="p-10 space-y-6">
              <form onSubmit={handleFirstPasswordSetup} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Seu E-mail Cadastrado</label>
                  <input
                    type="email"
                    required
                    value={firstPwdEmail}
                    onChange={(e) => setFirstPwdEmail(e.target.value)}
                    placeholder="ex@email.com"
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-pro-teal outline-none font-bold text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nova Senha</label>
                  <input
                    type="password"
                    required
                    value={firstPwdNew}
                    onChange={(e) => setFirstPwdNew(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-pro-teal outline-none font-bold text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmar Senha</label>
                  <input
                    type="password"
                    required
                    value={firstPwdConfirm}
                    onChange={(e) => setFirstPwdConfirm(e.target.value)}
                    placeholder="Repita a senha"
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-pro-teal outline-none font-bold text-sm"
                  />
                </div>
                {firstPwdError && (
                  <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-[10px] font-black uppercase tracking-widest">
                    {firstPwdError}
                  </div>
                )}
                <button
                  type="submit"
                  className="w-full py-5 bg-pro-teal text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[#014e63] transition-all shadow-xl active:scale-95"
                >
                  Cadastrar e Entrar
                </button>
              </form>
            </div>
          </motion.div>
        ) : view === "register" && !currentUser ? (
          <RegisterEditUserView 
            view={view}
            formData={formData}
            setFormData={setFormData}
            photoPreview={photoPreview}
            fileInputRef={fileInputRef}
            handlePhotoChange={handlePhotoChange}
            classes={classes}
            selectedUserClasses={selectedUserClasses}
            setSelectedUserClasses={setSelectedUserClasses}
            handleRegisterSubmit={handleRegisterSubmit}
            setView={setView}
            isGestor={false}
            regType={regType}
            setRegType={setRegType}
            role={null}
            handleInputChange={handleInputChange}
            users={users}
            currentUser={null}
            selectedUserId={null}
            setShowPasswordModal={(show) => setShowPasswordModal(show)}
            selectedEnrollmentDates={selectedEnrollmentDates}
            setSelectedEnrollmentDates={setSelectedEnrollmentDates}
            setEnrollmentModalClassId={setEnrollmentModalClassId}
          />
        ) : !currentUser ? (
          // Protected Views Safety Net: if no user, but trying to access protected view
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-6">
             <Logo className="h-20 w-auto animate-pulse" />
             <div className="text-center">
               <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs">Redirecionando para Login...</p>
             </div>
          </motion.div>
        ) : view === "first_login" ? (
          <motion.div
            key="first-login-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full md:max-w-none md:min-h-screen md:rounded-none max-w-[480px] bg-white rounded-[24px] shadow-theater overflow-hidden border border-white flex flex-col md:flex-row relative"
          >
            <div className="absolute top-4 left-4 z-20">
              <BackButton 
                onClick={handleLogout} 
                className="!text-white pointer-events-auto" 
              />
            </div>
            <div className="bg-gradient-to-br from-[#016a86] to-[#004e63] p-10 text-center relative overflow-hidden flex flex-col items-center justify-center md:w-1/2">
              <Logo className="h-16 md:h-32 w-auto mb-2 brightness-0 invert" />
              <h1 className="text-white text-2xl md:text-4xl font-bold tracking-tight">Primeiro Acesso</h1>
              <p className="text-teal-50/80 text-sm md:text-base mt-1 uppercase tracking-widest leading-none">Atualize suas credenciais</p>
            </div>
 
            <form onSubmit={handleFirstLoginSubmit} className="p-10 md:p-20 space-y-6 flex flex-col justify-center md:w-1/2">
              <div className="max-w-md mx-auto w-full space-y-6">
                <div className="bg-pro-teal/5 p-6 rounded-2xl border border-pro-teal/10 mb-4">
                  <p className="text-sm text-pro-teal font-bold text-center leading-relaxed">
                    Por segurança, você deve escolher um novo nome de usuário e uma senha pessoal antes de continuar.
                  </p>
                </div>
 
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Novo Usuário</label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Defina seu novo login"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 transition-all focus:outline-none focus:border-pro-teal"
                  />
                </div>
 
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Nova Senha</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 transition-all focus:outline-none focus:border-pro-teal"
                  />
                </div>
              </div>
 
              <button
                type="submit"
                className="w-full py-4 bg-[#016a86] text-white font-bold rounded-xl shadow-lg shadow-teal-900/20 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
              >
                Concluir e Acessar
              </button>
            </div>
          </form>
        </motion.div>
        ) : view === "dashboard" ? (
          role === "Gestor" ? (
            <GestorDashboard 
              currentUser={currentUser}
              users={users}
              handleLogout={handleLogout}
              setView={setView}
              handleResetUserForm={handleResetUserForm}
              filteredAnnouncements={filteredAnnouncements}
            />
          ) : role === "Professor" ? (
            <ProfessorDashboard 
              currentUser={currentUser}
              users={users}
              handleLogout={handleLogout}
              setView={setView}
              setFormData={setFormData}
              setPhotoPreview={setPhotoPreview}
              setSelectedUserClasses={setSelectedUserClasses}
              classes={classes}
              filteredAnnouncements={filteredAnnouncements}
            />
          ) : (
            <StudentDashboard 
              currentUser={currentUser}
              users={users}
              handleLogout={handleLogout}
              setView={setView}
              setFormData={setFormData}
              setPhotoPreview={setPhotoPreview}
              setSelectedUserClasses={setSelectedUserClasses}
              setAssessmentForm={setAssessmentForm}
              setSelectedClassId={setSelectedClassId}
              classes={classes}
              filteredAnnouncements={filteredAnnouncements}
              userBadges={currentUserBadges}
            />
          )
        ) : view === "users_list" ? (
          <UsersListView 
            users={users}
            filteredUsers={filteredUsers}
            filter={filter}
            setFilter={setFilter}
            setSelectedUserId={setSelectedUserId}
            setView={setView}
          />
        ) : view === "user_details" ? (
          <UserDetailsView 
            selectedUserId={selectedUserId}
            users={users}
            classes={classes}
            evaluations={evaluations}
            setViewingEvaluation={setViewingEvaluation}
            setView={setView}
            setFormData={setFormData}
            setPhotoPreview={setPhotoPreview}
            setSelectedUserClasses={setSelectedUserClasses}
            handleDeleteUser={handleDeleteUser}
            onResetPassword={handleAdminResetPassword}
            onUpdateEnrollmentDate={handleUpdateEnrollmentDate}
            onAwardBadge={handleAwardBadge}
            onRemoveBadge={handleRemoveBadge}
            selectedUserBadges={selectedUserBadges}
            currentUserRole={role || undefined}
            isGestor={role === "Gestor"}
            setSelectedClassId={setSelectedClassId}
            setSelectedEnrollmentDates={setSelectedEnrollmentDates}
            setEditEnrollmentInfo={setEditEnrollmentInfo}
          />
        ) : view === "create_class" ? (
          <CreateClassView 
            classData={classData}
            setClassData={setClassData}
            handleClassSubmit={handleClassSubmit}
            setView={setView}
            setShowInactivationPopup={setShowInactivationPopup}
            users={users}
          />
        ) : view === "classes_list" ? (
          <ClassesListView 
            classes={classes}
            users={users}
            setSelectedClassId={setSelectedClassId}
            setClassData={setClassData}
            setView={setView}
            role={role}
            currentUser={currentUser}
          />
        ) : view === "edit_class" ? (
          <CreateClassView 
            classData={classData}
            setClassData={setClassData}
            handleClassSubmit={handleEditClassSubmit}
            setView={setView}
            setShowInactivationPopup={setShowInactivationPopup}
            isEditing={true}
            handleDeleteClass={handleDeleteClass}
            users={users}
          />
        ) : view === "class_details" ? (
          <ClassDetailsView 
            selectedClassId={selectedClassId}
            classes={classes}
            users={users}
            role={role}
            currentUser={currentUser}
            setSelectedUserId={setSelectedUserId}
            setView={setView}
            setClassData={setClassData}
            showNotification={showNotification}
            handleAwardBadge={handleAwardBadge}
          />
        ) : view === "register" || view === "edit_self" || view === "edit_user" ? (
          <RegisterEditUserView 
            view={view}
            formData={formData}
            setFormData={setFormData}
            photoPreview={photoPreview}
            fileInputRef={fileInputRef}
            handlePhotoChange={handlePhotoChange}
            classes={classes}
            selectedUserClasses={selectedUserClasses}
            setSelectedUserClasses={setSelectedUserClasses}
            handleRegisterSubmit={handleRegisterSubmit}
            setView={setView}
            isGestor={role === "Gestor"}
            regType={regType}
            setRegType={setRegType}
            role={role}
            handleInputChange={handleInputChange}
            users={users}
            currentUser={currentUser}
            selectedUserId={selectedUserId}
            setShowPasswordModal={(show) => {
              if (view === "edit_user" && role === "Gestor" && selectedUserId !== currentUser?.uid) {
                setGestorResettingUid(selectedUserId);
              } else {
                setShowPasswordModal(show);
              }
            }}
            selectedEnrollmentDates={selectedEnrollmentDates}
            setSelectedEnrollmentDates={setSelectedEnrollmentDates}
            setEnrollmentModalClassId={setEnrollmentModalClassId}
          />
                          ) : view === "self_assessment" ? (
          <SelfAssessmentView 
            assessmentMonth={assessmentMonth}
            setAssessmentMonth={setAssessmentMonth}
            assessmentYear={assessmentYear}
            setAssessmentYear={setAssessmentYear}
            assessmentForm={assessmentForm}
            setAssessmentForm={setAssessmentForm}
            viewingEvaluation={viewingEvaluation}
            setViewingEvaluation={setViewingEvaluation}
            classes={classes}
            users={users}
            evaluations={evaluations}
            currentUser={currentUser}
            setView={setView}
            handleAssessmentSubmit={handleAssessmentSubmit}
          />
        ) : view === "evolution" ? (
          <EvolutionView 
            evaluations={evaluations}
            diaries={diaries}
            currentUser={currentUser}
            users={users}
            classes={classes}
            expandedPeriods={expandedPeriods}
            setExpandedPeriods={setExpandedPeriods}
            setAnalyticsClassId={setAnalyticsClassId}
            setView={setView}
          />
        ) : view === "evolution_charts" ? (
          <EvolutionChartsView 
            analyticsClassId={analyticsClassId}
            evaluations={evaluations}
            diaries={diaries}
            currentUser={currentUser}
            classes={classes}
            setView={setView}
            setAnalyticsClassId={setAnalyticsClassId}
          />
        ) : view === "professor_diary" ? (
          <ProfessorDiaryView 
            selectedClassId={selectedClassId}
            setSelectedClassId={setSelectedClassId}
            diaryFilterMonth={diaryFilterMonth}
            setDiaryFilterMonth={setDiaryFilterMonth}
            diaryFilterYear={diaryFilterYear}
            setDiaryFilterYear={setDiaryFilterYear}
            classes={classes}
            users={users}
            diaries={diaries}
            currentUser={users.find(u => u.id === currentUser?.uid) || null}
            setSelectedDiaryStudentId={setSelectedDiaryStudentId}
            setDiaryFormData={setDiaryFormData}
            setView={setView}
          />
        ) : view === "student_diary_form" ? (
          <StudentDiaryFormView 
            selectedClassId={selectedClassId}
            diaryFilterMonth={diaryFilterMonth}
            diaryFilterYear={diaryFilterYear}
            selectedDiaryStudentId={selectedDiaryStudentId}
            users={users}
            classes={classes}
            diaryFormData={diaryFormData}
            setDiaryFormData={setDiaryFormData}
            handleSubmitDiary={handleDiarySubmit}
            handleAwardBadge={handleAwardBadge}
            userRole={role}
            setView={setView}
          />
        ) : view === "manage_diaries" ? (
          <ManageDiariesView 
            diaries={diaries}
            users={users}
            pedagogicalRequests={pedagogicalRequests}
            setSelectedClassId={setSelectedClassId}
            setSelectedDiaryStudentId={setSelectedDiaryStudentId}
            setDiaryFilterMonth={setDiaryFilterMonth}
            setDiaryFilterYear={setDiaryFilterYear}
            setDiaryFormData={setDiaryFormData}
            setView={setView}
            handleDeleteDiary={handleDeleteDiary}
          />
        ) : view === "school_agenda" ? (
          <div className="flex-1 space-y-6">
            <BackButton onClick={() => setView("dashboard")} />
            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
              <AgendaEventos 
                currentUser={users.find(u => u.id === currentUser?.uid) || null}
                isGestor={role === "Gestor"}
              />
            </div>
          </div>
        ) : view === "create_announcement" ? (
          <CreateAnnouncementView 
            handleAnnouncementSubmit={handleAnnouncementSubmit}
            setView={setView}
            announcements={announcements}
            handleDeleteAnnouncement={handleDeleteAnnouncement}
            users={users}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center p-20 bg-white rounded-3xl border border-white/50">
            <Logo className="h-12 w-auto grayscale opacity-20" />
          </div>
        )}
      </AnimatePresence>

      {/* Password Change Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-md bg-white rounded-[32px] overflow-hidden shadow-2xl relative"
            >
              <div className="bg-pro-teal p-8 text-center text-white relative overflow-hidden">
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Lock size={32} />
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tight">Alteração de Senha</h3>
                  <p className="text-teal-50/70 text-[10px] font-bold uppercase tracking-widest mt-2">Defina uma senha segura para seu acesso</p>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              </div>

              <form onSubmit={handlePasswordUpdate} className="p-8 space-y-5">
                {passwordError && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold animate-shake">
                    <AlertCircle size={16} /> {passwordError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nova Senha</label>
                  <input
                    type="password"
                    value={pwdNew}
                    onChange={(e) => setPwdNew(e.target.value)}
                    required
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-800 transition-all focus:outline-none focus:border-pro-teal focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmar Nova Senha</label>
                  <input
                    type="password"
                    value={pwdConfirm}
                    onChange={(e) => setPwdConfirm(e.target.value)}
                    required
                    placeholder="Repita a senha"
                    className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-800 transition-all focus:outline-none focus:border-pro-teal focus:bg-white"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (!showPasswordModal) return; // Prevent double trigger
                      setShowPasswordModal(false);
                      setPwdNew("");
                      setPwdConfirm("");
                      setPasswordError("");
                    }}
                    className="flex-1 py-4 bg-slate-100 text-slate-500 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-slate-200 transition-all"
                  >
                    Agora não
                  </button>
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="flex-[2] py-4 bg-pro-teal text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-lg shadow-teal-900/20 hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {passwordLoading ? "Gravando..." : "Salvar Senha"}
                    {!passwordLoading && <CheckCircle2 size={14} />}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Enrollment Date Modal (Edit existing) */}
      <AnimatePresence>
        {editEnrollmentInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#004e63]/80 backdrop-blur-md z-[110] flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[40px] w-full max-w-sm overflow-hidden shadow-2xl"
            >
              <div className="bg-pro-orange p-8 text-center text-white">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-md">
                   <Calendar size={24} />
                </div>
                <h3 className="text-lg font-black uppercase tracking-tight">Editar Matrícula</h3>
                <p className="text-orange-50/70 text-[10px] mt-1 uppercase tracking-widest font-bold">Turma: {classes.find(c => c.id === editEnrollmentInfo.classId)?.code}</p>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nova Data de Matrícula</label>
                  <input
                    type="date"
                    required
                    value={editEnrollmentInfo.date}
                    onChange={(e) => setEditEnrollmentInfo({...editEnrollmentInfo, date: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-pro-orange outline-none font-bold text-sm transition-all"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setEditEnrollmentInfo(null)}
                    className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    CANCELAR
                  </button>
                  <button
                    onClick={() => {
                      if (editEnrollmentInfo.date) {
                        handleUpdateEnrollmentDate(editEnrollmentInfo.classId, editEnrollmentInfo.studentId, editEnrollmentInfo.date);
                      }
                      setEditEnrollmentInfo(null);
                    }}
                    className="flex-1 py-4 bg-pro-orange text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-lg"
                  >
                    SALVAR
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enrollment Date Modal (during registration) */}
      <AnimatePresence>
        {enrollmentModalClassId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#004e63]/80 backdrop-blur-md z-[110] flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[40px] w-full max-w-sm overflow-hidden shadow-2xl"
            >
              <div className="bg-pro-teal p-8 text-center">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white mx-auto mb-3 backdrop-blur-md">
                   <Calendar size={24} />
                </div>
                <h3 className="text-white text-lg font-black uppercase tracking-tight">Data de Matrícula</h3>
                <p className="text-teal-50/70 text-[10px] mt-1 uppercase tracking-widest font-bold">Turma: {classes.find(c => c.id === enrollmentModalClassId)?.code}</p>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Informe a data de início</label>
                  <input
                    type="date"
                    required
                    value={enrollmentModalDate}
                    onChange={(e) => setEnrollmentModalDate(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-pro-teal outline-none font-bold text-sm transition-all"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      // Remove class if cancelled and no date was set
                      if (!selectedEnrollmentDates[enrollmentModalClassId]) {
                        setSelectedUserClasses(prev => prev.filter(id => id !== enrollmentModalClassId));
                      }
                      setEnrollmentModalClassId(null);
                      setEnrollmentModalDate("");
                    }}
                    className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    IGNORAR
                  </button>
                  <button
                    onClick={() => {
                      if (enrollmentModalDate) {
                        setSelectedEnrollmentDates(prev => ({
                          ...prev,
                          [enrollmentModalClassId]: enrollmentModalDate
                        }));
                      }
                      setEnrollmentModalClassId(null);
                      setEnrollmentModalDate("");
                    }}
                    className="flex-1 py-4 bg-pro-teal text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-teal-900/20"
                  >
                    CONFIRMAR
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gestor Password Reset Modal (Other User) */}
      <AnimatePresence>
        {gestorResettingUid && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#014e63]/80 backdrop-blur-md z-[100] flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl relative"
            >
              <button 
                onClick={() => {
                  setGestorResettingUid(null);
                  setGestorNewPwd("");
                  setGestorResetError("");
                }}
                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all z-10"
              >
                <X size={20} />
              </button>
              
              <div className="bg-gradient-to-br from-orange-500 to-[#014e63] p-10 text-center">
                <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center text-white mx-auto mb-4 backdrop-blur-md">
                  <Lock size={32} />
                </div>
                <h3 className="text-white text-xl font-black uppercase tracking-tight">Redefinir Senha</h3>
                <p className="text-orange-50/70 text-[10px] mt-1 uppercase tracking-widest font-bold">Ação de Administrador</p>
              </div>

              <form onSubmit={handleGestorPasswordReset} className="p-10 space-y-6">
                <div className="space-y-4">
                  <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mb-4">
                    Você está redefinindo a senha para: <br/>
                    <span className="text-pro-teal">{users.find(u => u.id === gestorResettingUid)?.name}</span>
                  </p>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nova Senha Temporária</label>
                    <input
                      type="password"
                      required
                      value={gestorNewPwd}
                      onChange={(e) => setGestorNewPwd(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-pro-orange outline-none font-bold text-sm transition-all"
                    />
                  </div>

                  {gestorResetError && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 flex items-start gap-3"
                    >
                      <AlertCircle size={18} className="shrink-0" />
                      <p className="text-[10px] font-bold uppercase leading-tight">{gestorResetError}</p>
                    </motion.div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setGestorResettingUid(null);
                      setGestorNewPwd("");
                      setGestorResetError("");
                    }}
                    className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    CANCELAR
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-orange-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-orange-900/20"
                  >
                    REDEFINIR
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inactivation Reason Popup */}
      <AnimatePresence>
        {showInactivationPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="w-full max-w-[400px] bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col p-8 space-y-6"
            >
              <div className="text-center space-y-2">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest">Inativar Turma</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                  Por favor, descreva o motivo pelo qual esta turma está sendo inativada.
                </p>
              </div>

              <textarea
                autoFocus
                placeholder="Ex: Baixa adesão de alunos, problema no espaço físico, etc."
                value={classData.inactivationReason}
                onChange={(e) => setClassData(prev => ({ ...prev, inactivationReason: e.target.value }))}
                className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 transition-all focus:outline-none focus:border-pro-teal resize-none font-medium"
              />

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => {
                    setShowInactivationPopup(false);
                    setClassData(prev => ({ ...prev, isActive: true, inactivationReason: "" }));
                  }}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all active:scale-95 uppercase tracking-widest text-[10px]"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (classData.inactivationReason.trim()) {
                      setShowInactivationPopup(false);
                    } else {
                      showNotification("Por favor, insira o motivo.", "Aviso", "warning");
                    }
                  }}
                  className="flex-[2] py-4 bg-pro-teal text-white font-bold rounded-xl shadow-lg shadow-teal-900/20 hover:brightness-110 active:scale-95 transition-all uppercase tracking-widest text-[10px]"
                >
                  Confirmar Inativação
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cropper Modal */}
      <AnimatePresence>
        {isCropping && imageToCrop && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-[500px] bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-xl font-bold text-gray-800">Ajustar Enquadramento</h3>
                <p className="text-sm text-gray-500 font-medium">Arraste e use o zoom para centralizar o rosto</p>
              </div>

              <div className="relative h-[400px] bg-slate-900">
                <Cropper
                  image={imageToCrop}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                  cropShape="round"
                  showGrid={false}
                />
              </div>

              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Zoom</label>
                    <span className="text-xs font-bold text-pro-teal">{Math.round(zoom * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.1}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full accent-pro-teal cursor-pointer"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => {
                        setIsCropping(false);
                        setImageToCrop(null);
                    }}
                    className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all uppercase tracking-widest text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={showCroppedImage}
                    className="flex-1 py-3 bg-pro-teal text-white font-bold rounded-xl shadow-lg shadow-teal-900/20 hover:brightness-110 active:scale-95 transition-all uppercase tracking-widest text-xs"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="w-full max-w-[400px] bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col p-8 space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest">{confirmModal.title}</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                  {confirmModal.message}
                </p>
              </div>

              <div className="flex gap-3 w-full pt-2">
                <button
                  onClick={closeConfirmModal}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all active:scale-95 uppercase tracking-widest text-[10px]"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="flex-[2] py-4 bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-900/20 hover:brightness-110 active:scale-95 transition-all uppercase tracking-widest text-[10px]"
                >
                  Sim, Excluir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Level Help Modal */}
      <AnimatePresence>
        {isResetModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-red-950/90 backdrop-blur-md"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[40px] shadow-2xl relative z-10 overflow-hidden border-4 border-red-500"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-red-600 p-10 text-white text-center relative">
                 <motion.div 
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-md shadow-xl"
                 >
                   <AlertTriangle size={40} className="text-white" />
                 </motion.div>
                 <h3 className="text-3xl font-black uppercase tracking-tight leading-none mb-3">Atenção Crítica!</h3>
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-100">Ação de Exclusão Irreversível</p>
                 
                 <button 
                   onClick={() => setIsResetModalOpen(false)}
                   className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-white"
                 >
                   <X size={20} />
                 </button>
              </div>

              <div className="p-10 space-y-8">
                 <div className="space-y-4">
                   <p className="text-base font-bold text-slate-800 leading-relaxed text-center">
                     Ao prosseguir, <span className="text-red-600 underline decoration-2 underline-offset-4">TODOS os dados</span> do sistema serão permanentemente deletados.
                   </p>
                   <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
                     <ul className="text-xs font-bold text-red-800 space-y-2">
                       <li className="flex items-center gap-2">
                         <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                         Todas as turmas e anos letivos
                       </li>
                       <li className="flex items-center gap-2">
                         <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                         Todos os perfis de alunos e professores
                       </li>
                       <li className="flex items-center gap-2">
                         <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                         Histórico de avaliações e evoluções
                       </li>
                       <li className="flex items-center gap-2">
                         <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                         Diários de classe e registros
                       </li>
                     </ul>
                   </div>
                 </div>

                 <div className="flex flex-col gap-3">
                   <button 
                     onClick={handleExecuteReset}
                     className="w-full py-5 bg-red-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-600/30 active:scale-95"
                   >
                     Entendi, Apagar Tudo
                   </button>
                   <button 
                     onClick={() => setIsResetModalOpen(false)}
                     className="w-full py-5 bg-slate-100 text-slate-500 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                   >
                     Cancelar Operação
                   </button>
                 </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {helpLevelModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 sm:p-0 bg-[#014e63]/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[40px] shadow-2xl relative z-10 overflow-hidden border border-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-br from-pro-teal to-[#014e63] p-8 text-white text-center relative">
                 <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                   <HelpCircle size={32} />
                 </div>
                 <h3 className="text-2xl font-black uppercase tracking-tight leading-none mb-2">{helpLevelModal.title}</h3>
                 <p className="text-[10px] font-black uppercase tracking-widest text-teal-100/60">Entenda este nível de evolução</p>
                 
                 <button 
                   onClick={() => setHelpLevelModal(null)}
                   className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-white"
                 >
                   <X size={20} />
                 </button>
              </div>

              <div className="p-8 space-y-6">
                 <div>
                   <p className="text-[10px] font-black text-pro-teal uppercase tracking-widest mb-3">O que significa</p>
                   <p className="text-sm font-bold text-slate-700 leading-relaxed bg-slate-50 p-5 rounded-2xl border border-slate-100 italic">
                     "{helpLevelModal.motivation || helpLevelModal.detail}"
                   </p>
                 </div>

                 <button 
                   onClick={() => setHelpLevelModal(null)}
                   className="w-full py-4 bg-pro-teal text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[#014e63] transition-all shadow-lg hover:shadow-pro-teal/20"
                 >
                   Entendido
                 </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {notification.isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setNotification(prev => ({ ...prev, isOpen: false }))}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden border border-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`p-8 text-center space-y-6`}>
                <div className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center
                  ${notification.type === "success" ? "bg-teal-50 text-pro-teal" : 
                    notification.type === "error" ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-500"}`}
                >
                  {notification.type === "success" ? <CheckCircle2 size={40} /> : 
                   notification.type === "error" ? <AlertCircle size={40} /> : <AlertTriangle size={40} />}
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">{notification.title}</h3>
                  <p className="text-sm font-medium text-slate-500 leading-relaxed">
                    {notification.message}
                  </p>
                </div>

                <button 
                  onClick={() => setNotification(prev => ({ ...prev, isOpen: false }))}
                  className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95
                    ${notification.type === "success" ? "bg-pro-teal text-white shadow-teal-900/20 hover:brightness-110" : 
                      notification.type === "error" ? "bg-red-500 text-white shadow-red-900/20 hover:bg-red-600" : "bg-amber-500 text-white shadow-amber-900/20 hover:bg-amber-600"}`}
                >
                  Entendido
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAppLoading && <LoadingScreen />}
      </AnimatePresence>
    </div>
  );
}

