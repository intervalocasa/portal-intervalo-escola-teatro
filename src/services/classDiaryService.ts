/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { handleFirestoreError, OperationType } from "../lib/firestoreErrorHandler";
import { ClassDailyDiary, User, Class } from "../types";

const COLLECTION_NAME = "diarios_de_aula";
const LOCAL_STORAGE_KEY = "intervalo_class_daily_diaries";

// Helper to get local cached records
export function getLocalClassDiaries(): ClassDailyDiary[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn("Failed reading class diaries from localStorage", e);
    return [];
  }
}

// Helper to save local cached records
export function saveLocalClassDiaries(diaries: ClassDailyDiary[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(diaries));
  } catch (e) {
    console.warn("Failed saving class diaries to localStorage", e);
  }
}

/**
 * Fetch all class daily diaries with Firestore + local storage fallback
 */
export async function fetchClassDailyDiaries(classId?: string): Promise<ClassDailyDiary[]> {
  try {
    const colRef = collection(db, COLLECTION_NAME);
    let q;
    if (classId) {
      q = query(colRef, where("classId", "==", classId), orderBy("date", "desc"));
    } else {
      q = query(colRef, orderBy("date", "desc"));
    }

    const snap = await getDocs(q);
    const results: ClassDailyDiary[] = snap.docs.map(d => {
      const data = d.data() as any;
      return {
        id: d.id,
        classId: data.classId || "",
        className: data.className || "",
        classCode: data.classCode || "",
        classType: data.classType || "",
        date: data.date || "",
        teacherId: data.teacherId || "",
        teacherName: data.teacherName || "",
        authorRole: data.authorRole || "",
        attendances: data.attendances || {},
        studentObservations: data.studentObservations || {},
        classComment: data.classComment || "",
        isInternalPedagogicalOnly: true,
        totalStudents: data.totalStudents || 0,
        presentCount: data.presentCount || 0,
        absentCount: data.absentCount || 0,
        justifiedCount: data.justifiedCount || 0,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      };
    });

    // Cache results locally
    saveLocalClassDiaries(results);
    return results;
  } catch (error: any) {
    console.warn("Error fetching class daily diaries from Firestore, using offline cache:", error);
    const local = getLocalClassDiaries();
    if (classId) {
      return local.filter(d => d.classId === classId);
    }
    return local;
  }
}

/**
 * Fetch a specific class daily diary by classId and date
 */
export async function fetchClassDailyDiaryByClassAndDate(
  classId: string,
  date: string
): Promise<ClassDailyDiary | null> {
  try {
    const docId = `${classId}_${date}`;
    const colRef = collection(db, COLLECTION_NAME);
    const q = query(colRef, where("classId", "==", classId), where("date", "==", date));
    const snap = await getDocs(q);

    if (!snap.empty) {
      const docSnap = snap.docs[0];
      const data = docSnap.data();
      return {
        id: docSnap.id,
        classId: data.classId || classId,
        className: data.className || "",
        classCode: data.classCode || "",
        classType: data.classType || "",
        date: data.date || date,
        teacherId: data.teacherId || "",
        teacherName: data.teacherName || "",
        authorRole: data.authorRole || "",
        attendances: data.attendances || {},
        studentObservations: data.studentObservations || {},
        classComment: data.classComment || "",
        isInternalPedagogicalOnly: true,
        totalStudents: data.totalStudents || 0,
        presentCount: data.presentCount || 0,
        absentCount: data.absentCount || 0,
        justifiedCount: data.justifiedCount || 0,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      };
    }

    // Check local
    const local = getLocalClassDiaries();
    const found = local.find(d => d.classId === classId && d.date === date);
    return found || null;
  } catch (err) {
    console.warn("Error fetching diary by class & date:", err);
    const local = getLocalClassDiaries();
    return local.find(d => d.classId === classId && d.date === date) || null;
  }
}

/**
 * Save or update a class daily diary (chamada + relato confidencial)
 */
export async function saveClassDailyDiary(
  diary: Omit<ClassDailyDiary, "id" | "createdAt" | "updatedAt"> & { id?: string }
): Promise<string> {
  const docId = diary.id || `${diary.classId}_${diary.date}`;
  const docRef = doc(db, COLLECTION_NAME, docId);

  // Recalculate presence statistics
  let presentCount = 0;
  let absentCount = 0;
  let justifiedCount = 0;
  const attendances = diary.attendances || {};

  Object.values(attendances).forEach(status => {
    if (status === "presente") presentCount++;
    else if (status === "falta") absentCount++;
    else if (status === "justificada") justifiedCount++;
  });

  const payload: any = {
    classId: diary.classId,
    className: diary.className || "",
    classCode: diary.classCode || "",
    classType: diary.classType || "",
    date: diary.date,
    teacherId: diary.teacherId,
    teacherName: diary.teacherName || "",
    authorRole: diary.authorRole || "Professor",
    attendances: diary.attendances,
    studentObservations: diary.studentObservations || {},
    classComment: diary.classComment || "",
    isInternalPedagogicalOnly: true, // Garante que o comentário é estritamente confidencial
    totalStudents: diary.totalStudents || Object.keys(attendances).length,
    presentCount,
    absentCount,
    justifiedCount,
    updatedAt: serverTimestamp()
  };

  try {
    await setDoc(docRef, {
      ...payload,
      createdAt: serverTimestamp()
    }, { merge: true });

    // Update local cache
    const currentLocal = getLocalClassDiaries();
    const idx = currentLocal.findIndex(d => (d.id === docId) || (d.classId === diary.classId && d.date === diary.date));
    const newEntry: ClassDailyDiary = {
      ...payload,
      id: docId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (idx >= 0) {
      currentLocal[idx] = newEntry;
    } else {
      currentLocal.unshift(newEntry);
    }
    saveLocalClassDiaries(currentLocal);

    return docId;
  } catch (error: any) {
    console.warn("Firestore error saving class daily diary, saving to local cache:", error);
    // Offline local save
    const currentLocal = getLocalClassDiaries();
    const idx = currentLocal.findIndex(d => (d.id === docId) || (d.classId === diary.classId && d.date === diary.date));
    const newEntry: ClassDailyDiary = {
      ...payload,
      id: docId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (idx >= 0) {
      currentLocal[idx] = newEntry;
    } else {
      currentLocal.unshift(newEntry);
    }
    saveLocalClassDiaries(currentLocal);

    return docId;
  }
}

/**
 * Delete a class daily diary
 */
export async function deleteClassDailyDiary(docId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, docId));
  } catch (e) {
    console.warn("Error deleting class daily diary from Firestore:", e);
  }

  // Remove from local cache
  const local = getLocalClassDiaries().filter(d => d.id !== docId);
  saveLocalClassDiaries(local);
}
