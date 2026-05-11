import { 
  collection, 
  query, 
  where, 
  getDocs, 
  Timestamp 
} from "firebase/firestore";
import { db } from "./firebase";
import { BADGES } from "../constants/badges";

export const checkForBlogueirinhoBadge = async (
  userId: string, 
  classId: string, 
  handleAwardBadge: (studentId: string, badgeDef: any, customMessage?: string, forceUniqueKey?: string, classId?: string) => Promise<void>
) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const postsQuery = query(
      collection(db, "posts"),
      where("authorId", "==", userId),
      where("timestamp", ">=", Timestamp.fromDate(startOfMonth)),
      where("timestamp", "<=", Timestamp.fromDate(endOfMonth))
    );

    const snapshot = await getDocs(postsQuery);
    
    // If user has 3 or more posts this month
    if (snapshot.size >= 3) {
      const badgeDef = BADGES.find(b => b.badgeId === 'blogueirinho');
      if (badgeDef) {
        const uniqueKey = `blogueirinho_${now.getMonth() + 1}_${now.getFullYear()}_${userId}`;
        await handleAwardBadge(userId, badgeDef, undefined, uniqueKey, classId);
      }
    }
  } catch (error) {
    console.error("Erro ao verificar selo Blogueirinho:", error);
  }
};
