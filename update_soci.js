const fs = require('fs');
const path = './frontend/src/pages/Soci.jsx';
let content = fs.readFileSync(path, 'utf8');

// Add useLocation to imports if not there
if (!content.includes("from 'react-router-dom'")) {
    content = content.replace("import React,", "import { useLocation } from 'react-router-dom';\nimport React,");
} else if (!content.includes("useLocation")) {
    content = content.replace("import {", "import { useLocation,");
}

// Add the logic to read query param
const hookLogic = `
    const location = useLocation();
    const [hasOpenedFromUrl, setHasOpenedFromUrl] = useState(false);

    useEffect(() => {
        if (soci.length > 0 && !hasOpenedFromUrl) {
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

// Insert hookLogic inside the component
if (!content.includes("apriSocioPath")) {
    content = content.replace("const [currentRefYear, setCurrentRefYear] = useState(null);", "const [currentRefYear, setCurrentRefYear] = useState(null);\n" + hookLogic);
}

fs.writeFileSync(path, content);
console.log('Updated Soci.jsx');
