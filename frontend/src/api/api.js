import axios from "axios";

// 🔹 Direct backend URL define कर दो
const BASE_URL = "https://demomocck1.onrender.com/api";

// 🔹 Axios instance बनाओ"http://localhost:5000/api"
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

export default api;