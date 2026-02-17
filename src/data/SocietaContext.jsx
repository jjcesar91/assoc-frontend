import React, { createContext, useState, useEffect, useContext } from 'react';

const SocietaContext = createContext();

export const useSocieta = () => useContext(SocietaContext);

export const SocietaProvider = ({ children }) => {
    const [societaList, setSocietaList] = useState([]);
    // Initialize from localStorage
    const [selectedSocietaId, setSelectedSocietaId] = useState(() => {
        return localStorage.getItem('selectedSocietaId') || '';
    });
    const [loading, setLoading] = useState(true);

    // Persist to localStorage whenever selectedSocietaId changes
    useEffect(() => {
        if (selectedSocietaId) {
            localStorage.setItem('selectedSocietaId', selectedSocietaId);
        }
    }, [selectedSocietaId]);

    const fetchSocieta = async () => {
        try {
            const response = await fetch('/users/api/societa');
            const data = await response.json();
            if (Array.isArray(data)) {
                setSocietaList(data);
                
                // capture the initial value (from localStorage) or current closure value
                const currentId = selectedSocietaId;

                // If there's no selected ID, or the selected ID is not in the new list, select the first one
                if (data.length > 0 && (!currentId || !data.find(s => s.id === currentId))) {
                    setSelectedSocietaId(data[0].id);
                }
            }
        } catch (error) {
            console.error('Error fetching societa:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSocieta();
         // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <SocietaContext.Provider value={{ societaList, selectedSocietaId, setSelectedSocietaId, fetchSocieta, loading }}>
            {children}
        </SocietaContext.Provider>
    );
};
