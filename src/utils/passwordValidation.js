export const MIN_PASSWORD_LENGTH = 14;

export function getPasswordValidationErrors(password) {
    const value = typeof password === 'string' ? password : '';
    const errors = [];

    if (value.length < MIN_PASSWORD_LENGTH) {
        errors.push(`La password deve contenere almeno ${MIN_PASSWORD_LENGTH} caratteri`);
    }
    if (!/[A-Z]/.test(value)) {
        errors.push('La password deve contenere almeno una lettera maiuscola');
    }
    if (!/[a-z]/.test(value)) {
        errors.push('La password deve contenere almeno una lettera minuscola');
    }
    if (!/[0-9]/.test(value)) {
        errors.push('La password deve contenere almeno un numero');
    }
    if (!/[^A-Za-z0-9]/.test(value)) {
        errors.push('La password deve contenere almeno un carattere speciale');
    }

    return errors;
}