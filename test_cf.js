
import CodiceFiscale from 'codice-fiscale-js';

try {
    const cf = new CodiceFiscale('FRAFRE00D43H502F');
    console.log("Valid:", cf.code);
} catch (e) {
    console.log("Error Message:", e.message);
}

try {
    const cfOriginal = new CodiceFiscale('FRAFRA00D43H502F');
    console.log("Original Valid:", cfOriginal.code);
} catch (e) {
    console.log("Original Error Message:", e.message);
}
