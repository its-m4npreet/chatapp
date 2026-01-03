import axios from "axios";

const instance = axios.create({
	baseURL: "http://localhost:3001/api", // Adjust as needed
	withCredentials: true,
});

export default instance;
