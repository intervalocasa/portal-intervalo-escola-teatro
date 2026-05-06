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
  enableIndexedDbPersistence
} from "firebase/firestore";
import { handleFirestoreError, OperationType } from "./lib/firestoreErrorHandler";

import { THEME } from "./theme";
import { UserRole, User, Class, Diary, Evaluation } from "./types";
import { Logo, LoadingScreen, DetailItem } from "./components/CommonComponents";
import { LoginView } from "./views/LoginView";
import { GestorDashboard } from "./views/GestorDashboard";
import { ProfessorDashboard } from "./views/ProfessorDashboard";
import { StudentDashboard } from "./views/StudentDashboard";
import { UsersListView } from "./views/UsersListView";
import { UserDetailsView } from "./views/UserDetailsView";
import { CreateClassView } from "./views/CreateClassView";
import { ClassesListView } from "./views/ClassesListView";
import { ClassDetailsView } from "./views/ClassDetailsView";
import { RegisterEditUserView } from "./views/RegisterEditUserView";
import { SelfAssessmentView } from "./components/SelfAssessmentView";
import { EvolutionView } from "./components/EvolutionView";
import { EvolutionChartsView } from "./components/EvolutionChartsView";
import { ProfessorDiaryView } from "./views/ProfessorDiaryView";
import { StudentDiaryFormView } from "./views/StudentDiaryFormView";
import { ManageDiariesView } from "./views/ManageDiariesView";

export default function App() {
  const [isAppLoading, setIsAppLoading] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Connection validation
  useEffect(() => {
    async function testConnection() {
      try {
        // Try a specific doc that most likely doesn't exist but triggers a server-bound read
        await getDocFromServer(doc(db, 'system', 'connection_test'));
        setConnectionError(null);
      } catch (error: any) {
        console.error("Firebase Connection Test Failed:", error);
        const code = error.code || (error.message?.includes('permission') ? 'permission-denied' : '');
        
        if (error.message?.includes('offline') || error.code === 'unavailable' || error.code === 'failed-precondition') {
          setConnectionError("Offline: Não foi possível conectar ao Firebase.");
        } else if (code === 'permission-denied') {
          // Permissions are fine for connection, but maybe strict rules are blocking.
          // This is actually a sign of connection!
          setConnectionError(null);
        } else {
          setConnectionError(`Erro de Conexão: ${error.message || error.code}`);
        }
      }
    }
    testConnection();
  }, []);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [_view, _setView] = useState<"login" | "dashboard" | "register" | "edit_self" | "edit_user" | "first_login" | "users_list" | "user_details" | "create_class" | "classes_list" | "class_details" | "edit_class" | "self_assessment" | "evolution" | "professor_diary" | "manage_diaries" | "student_diary_form">("login");
  
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
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedDiaryStudentId, setSelectedDiaryStudentId] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  
  // Diary States
  const [diaries, setDiaries] = useState<any[]>([]);
  const [evolutionRecords, setEvolutionRecords] = useState<any[]>([]);
  const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(new Set());
  const [analyticsClassId, setAnalyticsClassId] = useState<string>("");
  const [diaryFilterMonth, setDiaryFilterMonth] = useState(new Date().getMonth() + 1);
  const [diaryFilterYear, setDiaryFilterYear] = useState(new Date().getFullYear());
  const [diaryFormData, setDiaryFormData] = useState({
    presences: 0,
    absences: 0,
    frequencyObs: "",
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
      alert("Senha alterada com sucesso!");
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

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const [selectedUserClasses, setSelectedUserClasses] = useState<string[]>([]);

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

  const [viewingEvaluation, setViewingEvaluation] = useState<any>(null);
  const [helpLevelModal, setHelpLevelModal] = useState<{title: string, detail: string, motivation: string} | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Classes State
  const [classes, setClasses] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      const criteria = isProfessional 
        ? PROFESSIONAL_COURSE_CRITERIA 
        : ADULT_COURSE_CRITERIA;
      
      const missingGrades = criteria.filter(c => diaryFormData.grades[c.id] === undefined);
      if (missingGrades.length > 0) {
        alert(`Por favor, preencha as notas de todos os critérios antes de concluir. Faltando criteria IDs: ${missingGrades.map(m => m.id).join(", ")}`);
        return;
      }

      if (diaryFormData.presences === undefined || diaryFormData.absences === undefined) {
        alert("Por favor, informe a quantidade de presenças e faltas.");
        return;
      }
    }

    setIsAppLoading(true);
    try {
      // Check if record already exists for this month/year/student/class
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
        studentName: studentData.name,
        studentEmail: studentData.email || "",
        classId: selectedClassId,
        className: selectedClass.code,
        classType: selectedClass.type,
        teacherId: currentUser.uid,
        teacherName: teacherData?.name || "Professor",
        month: diaryFilterMonth,
        year: diaryFilterYear,
        presences: Number(diaryFormData.presences || 0),
        absences: Number(diaryFormData.absences || 0),
        frequencyObs: diaryFormData.frequencyObs || "",
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

      alert(status === "concluido" ? "Diário de Classe concluído com sucesso." : "Diário de Classe salvo com sucesso.");
      setView("professor_diary");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "diarios_classe");
    } finally {
      setIsAppLoading(false);
      setLoading(false);
    }
  };

  // Users State (Firestore)
  const [users, setUsers] = useState<any[]>([]);
  const [gestorError, setGestorError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          setGestorError(null);
          
          // Determine if it's bootstrap mode
          const isBrandNewApp = (users.length === 0) || (user.email === 'intervalocasa@intervalocasa.com') || (user.email === 'intervalocasa@gmail.com');
          
          let userDocData: any = null;
          let userDocExists = false;
          let isRegisteredGestor = false;
          let userRole: any = null;

          try {
            const userRef = doc(db, "usuarios", user.uid);
            const userDoc = await getDoc(userRef);
            userDocExists = userDoc.exists();
            if (userDocExists) {
              userDocData = userDoc.data();
              isRegisteredGestor = userDocData?.role === 'Gestor';
              userRole = userDocData?.role;
            } else if (user.email) {
              // Fallback: search by email if UID doc doesn't exist
              const q = query(collection(db, "usuarios"), where("email", "==", user.email.toLowerCase()));
              const querySnapshot = await getDocs(q);
              if (!querySnapshot.empty) {
                userDocExists = true;
                userDocData = querySnapshot.docs[0].data();
                
                // If found by email, try to migrate the document ID to the UID for next time
                try {
                  const oldId = querySnapshot.docs[0].id;
                  const newId = user.uid;
                  
                  const newUserRef = doc(db, "usuarios", newId);
                  await setDoc(newUserRef, {
                    ...userDocData,
                    updatedAt: serverTimestamp()
                  });

                  if (oldId !== newId) {
                    // Migrate Classes
                    const allClassDocs = await getDocs(collection(db, "classes"));
                    for (const classDoc of allClassDocs.docs) {
                      const cData = classDoc.data();
                      let needsUpdate = false;
                      const updatePayload: any = {};

                      if (cData.studentIds?.includes(oldId)) {
                        updatePayload.studentIds = cData.studentIds.map((id: string) => id === oldId ? newId : id);
                        needsUpdate = true;
                      }
                      if (cData.teacherId === oldId) {
                        updatePayload.teacherId = newId;
                        needsUpdate = true;
                      }

                      if (needsUpdate) {
                        await updateDoc(doc(db, "classes", classDoc.id), updatePayload);
                      }
                    }

                    // Migrate Evaluations
                    const allEvalDocs = await getDocs(query(collection(db, "autoavaliacoes"), where("studentId", "==", oldId)));
                    for (const evalDoc of allEvalDocs.docs) {
                      await updateDoc(doc(db, "autoavaliacoes", evalDoc.id), { studentId: newId });
                    }

                    // Migrate Diaries (Teacher and Student refs)
                    const studentDiaryDocs = await getDocs(query(collection(db, "diarios_classe"), where("studentId", "==", oldId)));
                    for (const dDoc of studentDiaryDocs.docs) {
                      await updateDoc(doc(db, "diarios_classe", dDoc.id), { studentId: newId });
                    }
                    const teacherDiaryDocs = await getDocs(query(collection(db, "diarios_classe"), where("teacherId", "==", oldId)));
                    for (const dDoc of teacherDiaryDocs.docs) {
                      await updateDoc(doc(db, "diarios_classe", dDoc.id), { teacherId: newId });
                    }

                    // Migrate Evolucao if exists
                    const evolDocs = await getDocs(query(collection(db, "evolucao"), where("studentId", "==", oldId)));
                    for (const eDoc of evolDocs.docs) {
                      await updateDoc(doc(db, "evolucao", eDoc.id), { studentId: newId });
                    }

                    await deleteDoc(doc(db, "usuarios", oldId));
                  }
                } catch (migrationErr) {
                  console.warn("Migration to UID failed (ignoring):", migrationErr);
                }
              }
            }
          } catch (docErr: any) {
            console.error("Firestore getDoc Error:", docErr);
            
            let detailedError = `Erro de conexão (Firestore).`;
            
            if (docErr.message?.includes("not found")) {
              detailedError = `Banco de dados não encontrado. \n\n1. Vá ao Console do Firebase.\n2. Clique em 'Firestore Database'.\n3. Clique em 'Criar Banco de Dados'.\n4. Use o modo Produção e selecione a região mais próxima.`;
            } else if (docErr.message?.includes("offline")) {
              const domains = [
                window.location.hostname,
                "ais-dev-t6635xi3aonswqw5a7m23d-106509490447.us-east1.run.app",
                "ais-pre-t6635xi3aonswqw5a7m23d-106509490447.us-east1.run.app"
              ];
              detailedError = `Erro de conexão (Offline). \n\n1. Verifique se o Cloud Firestore está ativo no Console.\n2. Verifique os domínios autorizados em 'Authentication > Settings':\n• ${domains.join('\n• ')}`;
            } else {
              detailedError = `Erro ao carregar perfil: ${docErr.message || docErr.code}`;
            }

            // If it's NOT a gestor and there's an error, we must show it
            // We use the brand new app flag as a proxy for initial admin
            if (!isRegisteredGestor && !isBrandNewApp) {
              setError(detailedError);
              setLoading(false);
              return;
            }
          }
          
          if (!userRole) {
            userRole = isBrandNewApp ? "Gestor" : null;
          }

          if (userRole) {
            setCurrentUser(user);
            if (isBrandNewApp && !userDocExists) {
               // Auto-setup first gestor
               try {
                 const userRef = doc(db, "usuarios", user.uid);
                 const initialAdmin = {
                   name: user.email === 'intervalocasa@intervalocasa.com' ? "Gestor Intervalo" : (user.displayName || "Gestor Admin"),
                   artisticName: "Gestor",
                   role: "Gestor",
                   cpf: "admin", 
                   email: user.email,
                   createdAt: serverTimestamp(),
                   updatedAt: serverTimestamp()
                 };
                 await setDoc(userRef, initialAdmin);
               } catch (e) {
                 console.error("Failed to auto-setup gestor:", e);
               }
            }
            
            setRole(userRole as UserRole);
            if (view === "login") {
              setIsAppLoading(true);
              setTimeout(() => {
                setView("dashboard");
                setTimeout(() => {
                  setIsAppLoading(false);
                }, 500); // Small buffer for view transition
              }, 2500);
            }
          } else {
            setCurrentUser(null);
            setRole(null);
            setView("login");
          }
      } else {
        setCurrentUser(null);
        setRole(null);
        if (!gestorError) setView("login");
      }
      setLoading(false);
      } catch (authErr: any) {
        console.error("Auth Observer Error:", authErr);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [view, gestorError]);

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
        console.log("Firebase connection verified");
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration: Client is offline.");
          setError("Erro de conexão: O cliente está offline ou a configuração do Firebase está incorreta.");
        }
      }
    }
    testConnection();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const qUsers = collection(db, "usuarios");
    const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersData);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, "usuarios");
    });

    const qClasses = collection(db, "classes");
    const unsubscribeClasses = onSnapshot(qClasses, (snapshot) => {
      const classesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClasses(classesData);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, "classes");
    });

    const qEvals = collection(db, "autoavaliacoes");
    const unsubscribeEvals = onSnapshot(qEvals, (snapshot) => {
      const evalsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEvaluations(evalsData);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, "autoavaliacoes");
    });

    const qDiaries = collection(db, "diarios_classe");
    const unsubscribeDiaries = onSnapshot(qDiaries, (snapshot) => {
      const diariesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDiaries(diariesData);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, "diarios_classe");
    });

    const qEvolutions = collection(db, "evolucao");
    const unsubscribeEvolutions = onSnapshot(qEvolutions, (snapshot) => {
      const evolData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEvolutionRecords(evolData);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, "evolucao");
    });

    return () => {
      unsubscribeUsers();
      unsubscribeClasses();
      unsubscribeEvals();
      unsubscribeDiaries();
      unsubscribeEvolutions();
    };
  }, [currentUser]);
  const resetDatabase = async () => {
    if (!currentUser || role !== 'Gestor') return;
    setIsResetModalOpen(true);
  };

  const handleExecuteReset = async () => {
    setIsResetModalOpen(false);
    setIsAppLoading(true);
    try {
      setLoading(true);
      const deletePromises: any[] = [];
      
      classes.forEach(c => {
        deletePromises.push(deleteDoc(doc(db, "classes", c.id)));
      });
      
      users.forEach(u => {
        // Don't delete self during reset
        if (u.id !== currentUser?.uid) {
          deletePromises.push(deleteDoc(doc(db, "usuarios", u.id)));
        }
      });

      await Promise.all(deletePromises);
      alert("Banco de dados resetado com sucesso!");
    } catch (err) {
      console.error("Reset Error:", err);
      alert("Erro ao resetar banco de dados. Verifique a conexão.");
    } finally {
      setIsAppLoading(false);
      setLoading(false);
    }
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

  const filteredUsers = filter === "Todos" ? users : users.filter(u => u.role === filter);

  // Form State for Registration
  const [formData, setFormData] = useState({
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
    cnpj: ""
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
      
      // Check if user exists in Firestore
      const userRef = doc(db, "usuarios", user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        // If not, check if there's a user with this email to link
        const q = query(collection(db, "usuarios"), where("email", "==", user.email?.toLowerCase()));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          // Link existing Firestore user with this Auth UID
          const fsDoc = querySnapshot.docs[0];
          const fsUser = fsDoc.data();
          
          await setDoc(userRef, {
            ...fsUser,
            updatedAt: serverTimestamp()
          });
          
          // Delete old doc if different ID
          if (fsDoc.id !== user.uid) {
            await deleteDoc(doc(db, "usuarios", fsDoc.id));
          }
        } else {
          // Create new user record as default (if wanted) or restrict
          // The user requested "apenas para gestor", but usually we allow login
          // and let the rules/check handle the rest.
          // However, if the user isn't found, we can create a minimalist record.
          await setDoc(userRef, {
            name: user.displayName || "Usuário Google",
            artisticName: user.displayName || "Usuário Google",
            email: user.email?.toLowerCase() || "",
            role: "Aluno", 
            cpf: "google", // Required by rules
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp()
          });
        }
      }
    } catch (err: any) {
      console.error("Google login failed:", err);
      setError("Falha na autenticação com Google.");
    } finally {
      setIsAppLoading(false);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setIsAppLoading(true);
    setError("");
    const loginEmail = login.trim().toLowerCase();
    
    if (!loginEmail.includes("@")) {
      setError("Por favor, insira um e-mail válido.");
      setLoading(false);
      return;
    }
    
    try {
      await signInWithEmailAndPassword(auth, loginEmail, password.trim());
    } catch (err: any) {
      console.warn("Login attempt failed:", err.code);

      // Auto-setup requested gestor if doesn't exist in Auth
      if (loginEmail === "intervalocasa@intervalocasa.com" && password.trim() === "123456") {
        if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
          try {
            await createUserWithEmailAndPassword(auth, loginEmail, "123456");
            return; // onAuthStateChanged will handle the rest
          } catch (createErr: any) {
            console.error("Failed to create auto-gestor in Auth:", createErr);
          }
        }
      }
      
      // First login logic: check if user exists in Firestore and password matches CPF
      try {
        const cleanPassword = password.trim().replace(/\D/g, "").padStart(11, "0");

        // Try exact match first
        let q = query(collection(db, "usuarios"), where("email", "==", loginEmail));
        let querySnapshot = await getDocs(q);
        
        let fsDoc = null;
        let fsUser = null;

        if (!querySnapshot.empty) {
          // If we have multiple records, try to find the one where CPF matches
          const match = querySnapshot.docs.find(d => {
            const u = d.data();
            const uCpf = String(u.cpf || "").replace(/\D/g, "").padStart(11, "0");
            return uCpf === cleanPassword;
          });
          
          if (match) {
            fsDoc = match;
            fsUser = match.data();
          } else {
            // Pick first one as fallback
            fsDoc = querySnapshot.docs[0];
            fsUser = fsDoc.data();
          }
        } else {
          // Try case-insensitive search
          const allUsers = await getDocs(collection(db, "usuarios"));
          const match = allUsers.docs.find(d => {
            const u = d.data();
            if (typeof u.email !== "string" || u.email.trim().toLowerCase() !== loginEmail) return false;
            
            const uCpf = String(u.cpf || "").replace(/\D/g, "").padStart(11, "0");
            return uCpf === cleanPassword;
          });

          if (match) {
            fsDoc = match;
            fsUser = match.data();
          }
        }

        if (fsDoc && fsUser) {
          const cleanCPF = String(fsUser.cpf || "").replace(/\D/g, "").padStart(11, "0");
          const matchesCPF = (cleanCPF === cleanPassword && cleanCPF !== "00000000000");
          
          if (matchesCPF) {
            try {
              const userCredential = await createUserWithEmailAndPassword(auth, loginEmail, password.trim());
              const newUser = userCredential.user;
              const userRef = doc(db, "usuarios", newUser.uid);
              await setDoc(userRef, { ...fsUser, updatedAt: serverTimestamp() });
              
              // Trigger Password Change for first time
              setShowPasswordModal(true);
              
              if (fsDoc.id !== newUser.uid) {
                const oldId = fsDoc.id;
                const newId = newUser.uid;
                // Migrate Classes
                const allClassDocs = await getDocs(collection(db, "classes"));
                for (const classDoc of allClassDocs.docs) {
                  const cData = classDoc.data();
                  let needsUpdate = false;
                  const updatePayload: any = {};

                  if (cData.studentIds?.includes(oldId)) {
                    updatePayload.studentIds = cData.studentIds.map((id: string) => id === oldId ? newId : id);
                    needsUpdate = true;
                  }
                  if (cData.teacherId === oldId) {
                    updatePayload.teacherId = newId;
                    needsUpdate = true;
                  }

                  if (needsUpdate) {
                    await updateDoc(doc(db, "classes", classDoc.id), updatePayload);
                  }
                }

                // Migrate Evaluations
                const allEvalDocs = await getDocs(query(collection(db, "autoavaliacoes"), where("studentId", "==", oldId)));
                for (const evalDoc of allEvalDocs.docs) {
                  await updateDoc(doc(db, "autoavaliacoes", evalDoc.id), { studentId: newId });
                }

                // Migrate Diaries (Teacher and Student refs)
                const studentDiaryDocs = await getDocs(query(collection(db, "diarios_classe"), where("studentId", "==", oldId)));
                for (const dDoc of studentDiaryDocs.docs) {
                  await updateDoc(doc(db, "diarios_classe", dDoc.id), { studentId: newId });
                }
                const teacherDiaryDocs = await getDocs(query(collection(db, "diarios_classe"), where("teacherId", "==", oldId)));
                for (const dDoc of teacherDiaryDocs.docs) {
                  await updateDoc(doc(db, "diarios_classe", dDoc.id), { teacherId: newId });
                }

                // Migrate Evolucao if exists
                const evolDocs = await getDocs(query(collection(db, "evolucao"), where("studentId", "==", oldId)));
                for (const eDoc of evolDocs.docs) {
                  await updateDoc(doc(db, "evolucao", eDoc.id), { studentId: newId });
                }

                await deleteDoc(doc(db, "usuarios", oldId));
              }
              return;
            } catch (createErr: any) {
              if (createErr.code === "auth/email-already-in-use") {
                setError("Sua conta já existe, mas a senha está incorreta ou há um conflito de cadastro.");
              } else {
                setError(`Erro ao ativar conta: ${createErr.message}`);
              }
            }
          } else {
            setError("Email ou senha (CPF) incorretos. No primeiro acesso, use seu CPF cadastrado como senha.");
          }
        } else {
          setError("Cadastro não encontrado com este e-mail.");
        }
      } catch (fsErr) {
        console.error("Firestore lookup failed:", fsErr);
        setError("Erro de conexão ao verificar cadastro.");
      }
    } finally {
      setIsAppLoading(false);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsAppLoading(true);
    await signOut(auth);
    setTimeout(() => {
      setRole(null);
      setRegType("Aluno");
      _setView("login");
      setPhotoPreview(null);
      setLogin("");
      setPassword("");
      setNewUsername("");
      setNewPassword("");
      setSelectedUserClasses([]);
      setIsAppLoading(false);
    }, 1500);
  };

  const handleRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsAppLoading(true);
    try {
      const dataToSave = {
        name: formData.name,
        artisticName: formData.artisticName,
        role: view === "register" ? regType : (view === "edit_user" ? users.find(u => u.id === selectedUserId)?.role : role),
        cpf: formData.cpf,
        email: formData.email.toLowerCase(),
        phone: formData.phone,
        photo: photoPreview,
        ...formData,
        updatedAt: serverTimestamp()
      };

      let studentId = "";

      if (view === "register") {
        const docRef = await addDoc(collection(db, "usuarios"), {
          ...dataToSave,
          createdAt: serverTimestamp()
        });
        studentId = docRef.id;
        alert("Usuário cadastrado com sucesso!");
      } else {
        const targetId = view === "edit_user" ? selectedUserId : currentUser?.uid;
        if (targetId) {
          studentId = targetId;
          await updateDoc(doc(db, "usuarios", targetId), dataToSave);
          alert("Cadastro atualizado com sucesso!");
        }
      }

      // Synchronize Classes (Only if Gestor is making changes or during registration)
      if (role === "Gestor" && studentId) {
        const userType = view === "register" ? regType : users.find(u => u.id === studentId)?.role;
        
        for (const c of classes) {
          if (userType === "Professor") {
            const isCurrentTeacher = c.teacherId === studentId;
            const shouldBeTeacher = selectedUserClasses.includes(c.id);

            if (shouldBeTeacher && !isCurrentTeacher) {
              await updateDoc(doc(db, "classes", c.id), { teacherId: studentId });
            } else if (!shouldBeTeacher && isCurrentTeacher) {
              await updateDoc(doc(db, "classes", c.id), { teacherId: null });
            }
          } else {
            const isCurrentlyLinked = c.studentIds?.includes(studentId);
            const shouldBeLinked = selectedUserClasses.includes(c.id);

            if (shouldBeLinked && !isCurrentlyLinked) {
              // Add to class
              await updateDoc(doc(db, "classes", c.id), {
                studentIds: [...(c.studentIds || []), studentId]
              });
            } else if (!shouldBeLinked && isCurrentlyLinked) {
              // Remove from class
              await updateDoc(doc(db, "classes", c.id), {
                studentIds: c.studentIds.filter((id: string) => id !== studentId)
              });
            }
          }
        }
      }
      
      // Reset Form
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
        cnpj: ""
      });
      setPhotoPreview(null);
      setSelectedUserClasses([]);
      setView("dashboard");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "usuarios");
    } finally {
      setIsAppLoading(false);
    }
  };

  const handleFirstLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsAppLoading(true);
    try {
      if (currentUser) {
        // In this implementation, we just update the profile
        await updateDoc(doc(db, "usuarios", currentUser.uid), {
          username: newUsername, // just a field for now
          passwordChanged: true,
          updatedAt: serverTimestamp()
        });
      }
      alert("Credenciais atualizadas com sucesso!");
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
      alert("Turma criada com sucesso!");
      setView("dashboard");
      setClassData({
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

    const month = assessmentMonth;
    const year = assessmentYear;

    // Final Validation: all notes must be filled
    const criteria = selectedClass.type === "Curso Livre - Montagem Profissional" 
      ? [...PROFESSIONAL_CRITERIA_BASE, ...PROFESSIONAL_CRITERIA_MONTAGEM]
      : ADULT_CRITERIA;
    
    const missing = criteria.filter(c => assessmentForm.notes[c.id] === undefined);
    if (missing.length > 0) {
      alert(`Por favor, preencha todos os critérios obrigatórios. Faltando: ${missing.map(m => (m as any).label).join(", ")}`);
      return;
    }

    setLoading(true);
    try {
      const existingEval = evaluations.find(e => 
        e.studentId === studentId && 
        e.classId === assessmentForm.classId && 
        e.month === month && 
        e.year === year
      );

      const evaluationData = {
        studentId,
        studentName: studentData?.name || "Aluno",
        studentEmail: studentData?.email || "",
        classId: assessmentForm.classId,
        classType: selectedClass.type,
        month,
        year,
        notes: assessmentForm.notes,
        openAnswers: assessmentForm.openAnswers,
        updatedAt: serverTimestamp()
      };

      if (existingEval) {
        await updateDoc(doc(db, "autoavaliacoes", existingEval.id), evaluationData);
        alert("Autoavaliação atualizada com sucesso!");
      } else {
        await addDoc(collection(db, "autoavaliacoes"), {
          ...evaluationData,
          createdAt: serverTimestamp()
        });
        alert("Autoavaliação enviada com sucesso!");
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
      alert("Turma atualizada com sucesso!");
      setView("classes_list");
      setClassData({
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
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "classes");
    } finally {
      setIsAppLoading(false);
    }
  };

  const handleDeleteClass = async () => {
    if (!selectedClassId) return;
    
    const className = classes.find(c => c.id === selectedClassId)?.code || "esta turma";
    
    setConfirmModal({
      isOpen: true,
      title: "Excluir Turma",
      message: `Tem certeza que deseja excluir permanentemente ${className}? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        closeConfirmModal();
        setIsAppLoading(true);
        try {
          setLoading(true);
          await deleteDoc(doc(db, "classes", selectedClassId));
          alert("Turma excluída com sucesso!");
          setView("classes_list");
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `classes/${selectedClassId}`);
        } finally {
          setIsAppLoading(false);
          setLoading(false);
        }
      }
    });
  };

  const handleDeleteUser = async () => {
    if (!selectedUserId) return;
    
    const user = users.find(u => u.id === selectedUserId);
    if (!user) return;

    if (user.id === currentUser?.uid) {
      alert("Você não pode excluir seu próprio perfil.");
      return;
    }
    
    setConfirmModal({
      isOpen: true,
      title: "Excluir Usuário",
      message: `Tem certeza que deseja excluir permanentemente ${user.name}? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        closeConfirmModal();
        setIsAppLoading(true);
        try {
          setLoading(true);
          await deleteDoc(doc(db, "usuarios", selectedUserId));
          alert("Usuário excluído com sucesso!");
          setSelectedUserId(null);
          setView("users_list");
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `usuarios/${selectedUserId}`);
        } finally {
          setIsAppLoading(false);
          setLoading(false);
        }
      }
    });
  };

  const handleDeleteDiary = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Excluir Diário",
      message: `Tem certeza que deseja excluir permanentemente este registro de diário? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        closeConfirmModal();
        setIsAppLoading(true);
        try {
          setLoading(true);
          await deleteDoc(doc(db, "diarios_classe", id));
          alert("Diário excluído com sucesso!");
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `diarios_classe/${id}`);
        } finally {
          setIsAppLoading(false);
          setLoading(false);
        }
      }
    });
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
        {view === "login" ? (
          <LoginView 
            login={login}
            setLogin={setLogin}
            password={password}
            setPassword={setPassword}
            error={error}
            gestorError={gestorError}
            loading={loading}
            handleLogin={handleLogin}
            handleGoogleLogin={handleGoogleLogin}
            setView={setView}
          />
        ) : view === "first_login" ? (
          <motion.div
            key="first-login-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full md:max-w-none md:min-h-screen md:rounded-none max-w-[480px] bg-white rounded-[24px] shadow-theater overflow-hidden border border-white flex flex-col md:flex-row"
          >
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
              resetDatabase={resetDatabase}
              handleLogout={handleLogout}
              setView={setView}
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
              classes={classes}
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
            setSelectedClassId={setSelectedClassId}
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
            setSelectedUserId={setSelectedUserId}
            setView={setView}
            db={db}
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
            setShowPasswordModal={setShowPasswordModal}
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
            setView={setView}
          />
        ) : view === "manage_diaries" ? (
          <ManageDiariesView 
            diaries={diaries}
            users={users}
            setSelectedClassId={setSelectedClassId}
            setSelectedDiaryStudentId={setSelectedDiaryStudentId}
            setDiaryFilterMonth={setDiaryFilterMonth}
            setDiaryFilterYear={setDiaryFilterYear}
            setDiaryFormData={setDiaryFormData}
            setView={setView}
            handleDeleteDiary={handleDeleteDiary}
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
                      alert("Por favor, insira o motivo.");
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
        {isAppLoading && <LoadingScreen />}
      </AnimatePresence>
    </div>
  );
}

