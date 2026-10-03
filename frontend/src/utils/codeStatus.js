/** Form submit se pehle: code khaali (optional) ya available hona chahiye */
export const codeStatusBlocksSubmit = (code, status) => Boolean(code) && status !== "available";
