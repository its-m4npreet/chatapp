import axios from "axios";

const instance = axios.create({
	baseURL: `${import.meta.env.VITE_BACKEND_URL}/api`, // Adjust as needed
	withCredentials: true,
});

export default instance;
