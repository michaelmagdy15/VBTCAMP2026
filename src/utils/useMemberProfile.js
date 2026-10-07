import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, DEFAULT_COMMUNITY_ID } from '../firebase';
import {
  memberDocPath,
  updateMemberPublicProfile,
  updateMemberPrivateProfile,
  getMemberPrivateProfile,
} from '../services/memberService';

/**
 * Custom React hook for managing the active member's public and private profile state.
 *
 * @param {string|null} memberId - Member ID or Firebase Auth UID
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {boolean} [isAdmin=false]
 */
export function useMemberProfile(memberId, communityId = DEFAULT_COMMUNITY_ID, isAdmin = false) {
  const [publicProfile, setPublicProfile] = useState(null);
  const [privateProfile, setPrivateProfile] = useState(null);
  const [loading, setLoading] = useState(Boolean(memberId));
  const [error, setError] = useState(null);

  // Subscribe to public profile updates in real time
  useEffect(() => {
    if (!memberId) return;

    let isMounted = true;
    const docRef = doc(db, memberDocPath(communityId, memberId));
    const unsubscribePublic = onSnapshot(
      docRef,
      (docSnap) => {
        if (!isMounted) return;
        if (docSnap.exists()) {
          setPublicProfile({ id: docSnap.id, ...docSnap.data() });
        } else {
          setPublicProfile(null);
        }
        setLoading(false);
      },
      (err) => {
        if (!isMounted) return;
        console.error('[useMemberProfile] Public profile error:', err);
        setError(err);
        setLoading(false);
      }
    );

    // Fetch private profile
    getMemberPrivateProfile(communityId, memberId)
      .then((priv) => {
        if (isMounted) setPrivateProfile(priv);
      })
      .catch((err) => {
        console.warn('[useMemberProfile] Private profile fetch warning:', err);
      });

    return () => {
      isMounted = false;
      unsubscribePublic();
    };
  }, [memberId, communityId]);

  const updatePublic = useCallback(
    async (updates) => {
      if (!memberId) return;
      try {
        setError(null);
        const applied = await updateMemberPublicProfile(communityId, memberId, updates, isAdmin);
        setPublicProfile((prev) => (prev ? { ...prev, ...applied } : prev));
        return applied;
      } catch (err) {
        console.error('[useMemberProfile] updatePublic failed:', err);
        setError(err);
        throw err;
      }
    },
    [communityId, memberId, isAdmin]
  );

  const updatePrivate = useCallback(
    async (updates) => {
      if (!memberId) return;
      try {
        setError(null);
        const applied = await updateMemberPrivateProfile(communityId, memberId, updates, isAdmin);
        setPrivateProfile((prev) => (prev ? { ...prev, ...applied } : prev));
        return applied;
      } catch (err) {
        console.error('[useMemberProfile] updatePrivate failed:', err);
        setError(err);
        throw err;
      }
    },
    [communityId, memberId, isAdmin]
  );

  const reloadPrivate = useCallback(async () => {
    if (!memberId) return;
    try {
      const priv = await getMemberPrivateProfile(communityId, memberId);
      setPrivateProfile(priv);
    } catch (err) {
      console.warn('[useMemberProfile] reloadPrivate failed:', err);
    }
  }, [communityId, memberId]);

  return {
    publicProfile: memberId ? publicProfile : null,
    privateProfile: memberId ? privateProfile : null,
    loading: memberId ? loading : false,
    error,
    updatePublic,
    updatePrivate,
    reloadPrivate,
  };
}
