const fs = require('fs');
const file = '/home/dave/management-software/frontend/src/pages/Soci.jsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('useLocation')) {
    content = content.replace(
        "import React, { useState, useEffect } from 'react';",
        "import React, { useState, useEffect } from 'react';\nimport { useLocation } from 'react-router-dom';"
    );
}

if (!content.includes('apriSocioPath')) {
    let hook = `
    const location = useLocation();
    const [hasOpenedFromUrl, setHasOpenedFromUrl] = useState(false);

    useEffect(() => {
        if (soci && soci.length > 0 && !hasOpenedFromUrl) {
            const params = new URLSearchParams(location.search);
            const apriSocioId = params.get('apriSocioPath');
            if (apriSocioId) {
                const socioDaAprire = soci.find(s => s.id.toString() === apriSocioId);
                if (socioDaAprire) {
                    setSelectedSocio(socioDaAprire);
                    setShowModal(true);
                    setHasOpenedFromUrl(true);
                }
            }
        }
    }, [soci, location.search, hasOpenedFromUrl]);
    `;
    
    content = content.replace(
        "const [currentRefYear, setCurrentRefYear] = useState(null);",
        "const [currentRefYear, setCurrentRefYear] = useState(null);\n" + hook
    );
}

fs.writeFileSync(file, content);
console.log("Patched Soci.jsx!");
