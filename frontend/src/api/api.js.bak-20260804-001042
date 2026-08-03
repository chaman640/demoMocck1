import axios from "axios";

// baseURL:
//  - dev  → "/api" + vite.config.js ka proxy → http://localhost:5000/api
//  - prod → "/api" same origin (Express hi frontend/dist serve karta hai)
//  - agar kabhi backend alag domain pe ho, to frontend/.env mein
//    VITE_API_BASE_URL=https://api.example.com/api set kar dein.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  withCredentials: true,
});

// 🐛 FIX: pehle agar server HTML (404 page ya crash page) bhej deta tha to
// axios usko silently accept kar leta tha aur component `res.data.data` pe
// crash hota tha ("Cannot read properties of undefined"). Ab saaf error milta hai.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const contentType = error?.response?.headers?.["content-type"] || "";
    if (error?.response && contentType.includes("text/html")) {
      error.response.data = {
        success: false,
        message:
          "Server se galat response aaya (API route nahi mila). Backend chal raha hai kya?",
      };
    }
    return Promise.reject(error);
  }
);

export default api;
