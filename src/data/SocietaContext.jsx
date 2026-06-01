import React, { createContext, useState, useEffect, useContext, useRef } from 'react';

const SocietaContext = createContext();

export const useSocieta = () => useContext(SocietaContext);

export const SocietaProvider = ({ children }) => {
    const [societaList, setSocietaList] = useState([]);
    // Start neutral to avoid firing page-level requests with stale IDs before validation.
    const [selectedSocietaId, setSelectedSocietaId] = useState('');
    const storedSelectedSocietaIdRef = useRef(localStorage.getItem('selectedSocietaId') || '');
    const [loading, setLoading] = useState(true);

    // Persist to localStorage whenever selectedSocietaId changes
    useEffect(() => {
        if (selectedSocietaId) {
            localStorage.setItem('selectedSocietaId', selectedSocietaId);
        } else {
            localStorage.removeItem('selectedSocietaId');
        }
    }, [selectedSocietaId]);

    const fetchSocieta = async () => {
        try {
            let me = null;
            const token = localStorage.getItem('token');
            if (!token) {
                setSocietaList([]);
                setSelectedSocietaId('');
                return;
            }

            if (token) {
                const meResponse = await fetch('/auth/api/me', {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (meResponse.ok) {
                    me = await meResponse.json();
                }
            }

            const response = await fetch('/users/api/societa', {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            });
            const data = await response.json();
            if (Array.isArray(data)) {
                const resolvedRole = String(me?.role || localStorage.getItem('user_role') || '').toLowerCase();
                const isSuperuser = resolvedRole === 'superuser';
                const meSocietaId = me?.societaId ?? me?.societa_id ?? me?.societa?.id;
                const forcedSocietaId = !isSuperuser && meSocietaId ? String(meSocietaId) : '';

                const filteredSocieta = forcedSocietaId
                    ? data.filter(s => String(s.id) === forcedSocietaId)
                    : data;

                // If the forced id is stale/missing, keep full list to avoid an empty selector.
                const visibleSocieta = filteredSocieta.length > 0 ? filteredSocieta : data;

                setSocietaList(visibleSocieta);

                // Non-superuser users must always stay on their assigned society.
                if (forcedSocietaId && visibleSocieta.some(s => String(s.id) === forcedSocietaId)) {
                    setSelectedSocietaId(forcedSocietaId);
                    return;
                }

                // Preserve the latest selected ID across refreshes; fallback only if it is no longer valid.
                setSelectedSocietaId((prevSelectedId) => {
                    if (!visibleSocieta.length) {
                        return '';
                    }

                    const prevId = prevSelectedId ? String(prevSelectedId) : '';
                    const storedId = storedSelectedSocietaIdRef.current
                        ? String(storedSelectedSocietaIdRef.current)
                        : '';
                    const stillValid = prevId && visibleSocieta.some(s => String(s.id) === prevId);
                    const storedStillValid = storedId && visibleSocieta.some(s => String(s.id) === storedId);

                    if (stillValid) {
                        return prevId;
                    }

                    if (storedStillValid) {
                        return storedId;
                    }

                    return String(visibleSocieta[0].id);
                });
            }
        } catch (error) {
            console.error('Error fetching societa:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (localStorage.getItem('token')) {
            fetchSocieta();
        } else {
            setLoading(false);
        }
         // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const onSessionUpdated = () => {
            if (localStorage.getItem('token')) {
                setLoading(true);
                fetchSocieta();
            } else {
                setSocietaList([]);
                setSelectedSocietaId('');
                setLoading(false);
            }
        };

        window.addEventListener('session-updated', onSessionUpdated);
        return () => {
            window.removeEventListener('session-updated', onSessionUpdated);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <SocietaContext.Provider value={{ societaList, selectedSocietaId, setSelectedSocietaId, fetchSocieta, loading }}>
            {children}
        </SocietaContext.Provider>
    );
};
