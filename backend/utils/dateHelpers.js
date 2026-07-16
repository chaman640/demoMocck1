// IST (UTC+5:30) ke hisaab se "aaj" ki date "YYYY-MM-DD" format mein deta hai.
// Server (Render) UTC mein chalta hai — seedha new Date() use karne se
// raat 12:00 se subah 5:30 IST tak "kal" ki date aa jaati, isliye ye helper zaroori hai.
export const getTodayIST = () => {
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffsetMs);
  return istTime.toISOString().split("T")[0];
};