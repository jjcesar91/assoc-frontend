
import CodiceFiscale from 'codice-fiscale-js';

const cfToCheck = 'CRSGNN80A01F839L';
try {
    const cf = new CodiceFiscale(cfToCheck);
    console.log("Keys:", Object.keys(cf));
    console.log("Full Object:", JSON.stringify(cf, null, 2));
    
    // Check prototypes or getters
    console.log("birthDate:", cf.birthDate);
    console.log("birthday:", cf.birthday);
    console.log("date:", cf.date);
    console.log("birthPlace:", cf.birthPlace);
    console.log("birthplace:", cf.birthplace);
    console.log("toJSON:", cf.toJSON ? cf.toJSON() : "no toJSON");
} catch (e) {
    console.error("Error:", e.message);
}
