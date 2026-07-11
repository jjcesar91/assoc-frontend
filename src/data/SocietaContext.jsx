import React, { createContext, useState, useEffect, useContext, useRef } from 'react';

const SocietaContext = createContext();

export const useSocieta = () => useContext(SocietaContext);

export const SocietaProvider = ({ children }) => {
    const [societaList, setSocietaList] = useState([]);
    // Start neutral to avoid firing page-level requests with stale IDs before validation.
    const [selectedSocietaId, setSelectedSocietaId] = useState('');
    const storedSelectedSocietaIdRef = useRef(localStorage.getItem('selectedSocietaId') || '');
    const [loading, setLoading] = useState(true);
    // Info utente corrente: ruolo + società consentite (per la tendina multi-società).
    const [userInfo, setUserInfo] = useState(null);

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
                const meSocietaIds = Array.isArray(me?.societaIds) ? me.societaIds : [];
                // Utente multi-società: stessa email registrata in più società → tendina come il superuser.
                const isMultiSocieta = meSocietaIds.length > 1;
                setUserInfo({ role: resolvedRole, societaIds: meSocietaIds });
                const meSocietaId = me?.societaId ?? me?.societa_id ?? me?.societa?.id;
                const forcedSocietaId = (!isSuperuser && !isMultiSocieta && meSocietaId) ? String(meSocietaId) : '';

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

    // Cambio società dalla tendina.
    // - superuser: solo lato client (nessun cambio token), come oggi.
    // - utente multi-società: richiede un nuovo token per la riga della società scelta
    //   (ruolo/features corretti), poi aggiorna la sessione.
    const selectSocieta = async (id) => {
        const targetId = String(id);
        const role = String(userInfo?.role || localStorage.getItem('user_role') || '').toLowerCase();
        const isMultiSocieta = Array.isArray(userInfo?.societaIds) && userInfo.societaIds.length > 1;

        if (role !== 'superuser' && isMultiSocieta) {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch('/auth/api/switch-societa', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ societaId: parseInt(targetId, 10) }),
                });
                if (res.ok) {
                    const data = await res.json();
                    localStorage.setItem('token', data.accessToken);
                    if (data.refreshToken) localStorage.setItem('refresh_token', data.refreshToken);
                    // Ruolo/features possono differire per società: aggiorniamoli.
                    try {
                        const meRes = await fetch('/auth/api/me', {
                            headers: { 'Authorization': `Bearer ${data.accessToken}` },
                        });
                        if (meRes.ok) {
                            const me = await meRes.json();
                            localStorage.setItem('user_role', me.role || 'user');
                            localStorage.setItem('user_features', JSON.stringify(me.features ?? null));
                            setUserInfo({ role: String(me.role || '').toLowerCase(), societaIds: me.societaIds || [] });
                        }
                    } catch (_) { /* ignora: role/features restano quelli precedenti */ }
                } else {
                    console.error('Cambio società non riuscito', res.status);
                }
            } catch (e) {
                console.error('Errore cambio società:', e);
            }
        }

        setSelectedSocietaId(targetId);
        window.dispatchEvent(new Event('session-updated'));
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
        <SocietaContext.Provider value={{ societaList, selectedSocietaId, setSelectedSocietaId, selectSocieta, userInfo, fetchSocieta, loading }}>
            {children}
        </SocietaContext.Provider>
    );
};
