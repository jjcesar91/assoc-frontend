import React, { createContext, useState, useEffect, useContext } from 'react';

const SocietaContext = createContext();

export const useSocieta = () => useContext(SocietaContext);

export const SocietaProvider = ({ children }) => {
    const [societaList, setSocietaList] = useState([]);
    const [selectedSocietaId, setSelectedSocietaId] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchSocieta = async () => {
        try {
            const response = await fetch('/users/api/societa');
            const data = await response.json();
            if (Array.isArray(data)) {
                setSocietaList(data);
                // If there's no selected ID, or the selected ID is not in the new list, select the first one
                if (data.length > 0 && (!selectedSocietaId || !data.find(s => s.id === selectedSocietaId))) {
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
    }, []);

    return (
        <SocietaContext.Provider value={{ societaList, selectedSocietaId, setSelectedSocietaId, fetchSocieta, loading }}>
            {children}
        </SocietaContext.Provider>
    );
};
