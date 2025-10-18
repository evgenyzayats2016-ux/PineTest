import { useState, useEffect } from 'react';
import {
  doc,
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  DocumentData,
  Query,
  DocumentReference,
  getDoc,
  getDocs,
  QuerySnapshot,
  FirestoreError,
} from 'firebase/firestore';
import { db } from '../firebase/config';

// FIX: Allow readonly arrays for query constraints to match `as const` usage with `useMemo`.
type QueryConstraint = {
    where?: readonly [string, '==', any];
    orderBy?: readonly [string, 'asc' | 'desc'];
    limit?: number;
}

// FIX: Accept a readonly tuple for the query parameter to align with `as const` usage.
// FIX: Error on line 41: Spread types may only be created from object types.
// This is fixed by constraining T to DocumentData, ensuring T is always an object.
export const useFirestore = <T extends DocumentData>(pathOrQuery: string | readonly [string, QueryConstraint]) => {
  const [data, setData] = useState<T[] | T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let unsubscribe: () => void;
    setLoading(true);

    try {
        if (typeof pathOrQuery === 'string') {
            // Path to a document
            const docRef = doc(db, pathOrQuery) as DocumentReference<T>;
            unsubscribe = onSnapshot(docRef, (docSnap) => {
                if (docSnap.exists()) {
                    setData({ ...docSnap.data(), id: docSnap.id } as T);
                } else {
                    setData(null);
                }
                setLoading(false);
            }, (err: FirestoreError) => {
                console.error(err);
                // FIX: Error on line 48: Argument of type 'FirestoreError' is not assignable to parameter of type 'SetStateAction<Error>'.
                // Create a new Error object from the FirestoreError to match the state's type.
                setError(new Error(err.message));
                setLoading(false);
            });
        } else {
             // Path to a collection with optional query
             const [path, constraints] = pathOrQuery;
             // FIX: Correctly type `q` as `Query<DocumentData>` to match the return type of `collection()`, preventing an unsafe type conversion.
             let q: Query<DocumentData> = collection(db, path);
             
             if (constraints?.where) {
                // Ensure the value for the where clause is not undefined
                if(constraints.where[2] !== undefined) {
                    q = query(q, where(...constraints.where));
                } else {
                    // If the user ID (or other filter) is not ready, don't query
                    setLoading(false);
                    setData([]); // Return empty array if query can't run
                    return;
                }
             }
             if (constraints?.orderBy) q = query(q, orderBy(...constraints.orderBy));
             if (constraints?.limit) q = query(q, limit(constraints.limit));

             // FIX: Error on line 73: Property 'forEach' does not exist on type 'DocumentSnapshot<unknown, DocumentData>'.
             // Explicitly type `querySnapshot` to fix incorrect type inference by TypeScript.
             unsubscribe = onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
                const results: T[] = [];
                querySnapshot.forEach((doc) => {
                    results.push({ ...doc.data(), strategyId: doc.id, tradeId: doc.id } as T);
                });
                setData(results);
                setLoading(false);
            }, (err: FirestoreError) => {
                console.error(err);
                // FIX: Error on line 80: Argument of type 'FirestoreError' is not assignable to parameter of type 'SetStateAction<Error>'.
                // Create a new Error object from the FirestoreError to match the state's type.
                setError(new Error(err.message));
                setLoading(false);
            });
        }
    } catch (err: any) {
        setError(err);
        setLoading(false);
        console.error("Firestore hook error:", err);
    }
    
    // Cleanup subscription on unmount
    return () => unsubscribe && unsubscribe();
  }, [JSON.stringify(pathOrQuery)]); // Re-run effect if path or query changes

  return { data, loading, error };
};
