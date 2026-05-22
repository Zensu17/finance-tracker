import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, getDocs, updateDoc, doc, deleteDoc, orderBy } from 'firebase/firestore';
import type { Transaction, Budget } from './App';

// Firebase configuration - replace with your own Firebase project config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

// Sign out
export const signOutUser = async () => {
  await signOut(auth);
};

// Transaction services
export const addTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt'>, userId: string) => {
  const docRef = await addDoc(collection(db, 'users', userId, 'transactions'), {
    ...transaction,
    createdAt: Date.now()
  });
  return { id: docRef.id, ...transaction, createdAt: Date.now() };
};

export const getTransactions = async (userId: string) => {
  const q = query(collection(db, 'users', userId, 'transactions'), orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
    const data = doc.data() as Omit<Transaction, 'id'>;
    return { ...data, id: doc.id };
  });
};

export const updateTransaction = async (userId: string, transactionId: string, updates: Partial<Transaction>) => {
  const docRef = doc(db, 'users', userId, 'transactions', transactionId);
  await updateDoc(docRef, updates);
};

export const deleteTransaction = async (userId: string, transactionId: string) => {
  const docRef = doc(db, 'users', userId, 'transactions', transactionId);
  await deleteDoc(docRef);
};

// Budget services
export const addBudget = async (budget: Omit<Budget, 'month'>, userId: string) => {
  const docRef = await addDoc(collection(db, 'users', userId, 'budget'), {
    ...budget,
    month: new Date().toISOString().slice(0, 7)
  });
  return { id: docRef.id, ...budget, month: new Date().toISOString().slice(0, 7) };
};

export const getBudget = async (userId: string) => {
  const q = query(collection(db, 'users', userId, 'budget'), orderBy('month', 'desc'));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return { limit: 0, month: new Date().toISOString().slice(0, 7) };
  const latest = querySnapshot.docs[0];
  const data = latest.data() as Omit<Budget, 'id'>;
  return { ...data, id: latest.id };
};

export const updateBudget = async (userId: string, budgetId: string, limit: number) => {
  const docRef = doc(db, 'users', userId, 'budget', budgetId);
  await updateDoc(docRef, { limit });
};