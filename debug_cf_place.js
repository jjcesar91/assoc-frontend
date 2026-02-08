
import CodiceFiscale from 'codice-fiscale-js';

const cfToCheck = 'CRSGNN80A01F839L';
try {
    const cf = new CodiceFiscale(cfToCheck);
    console.log("CF String:", cf.code);
    console.log("BirthPlace Object:", JSON.stringify(cf.birthPlace));
    console.log("Gender:", cf.gender);
    console.log("BirthDate:", cf.birthDate);
} catch (e) {
    console.error("Error:", e.message);
}
