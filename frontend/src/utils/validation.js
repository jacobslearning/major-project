export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

// Password regex, 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
export const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&£#()[\]{}\-_=+<>.,])[A-Za-z\d@$!%*?&£#()[\]{}\-_=+<>.,]{8,}$/;

export const isValidEmail = (email) => emailRegex.test(email);

export const isValidPassword = (password) => passwordRegex.test(password);

export const getPasswordRules = (password = "") => {
  return {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[@$!%*?&£#()[\]{}\-_=+<>.,]/.test(password),
  };
};
