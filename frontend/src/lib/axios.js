import axios from "axios";

const instance = axios.create({
	baseURL: `${import.meta.env.VITE_BACKEND_URL}/api`, // Adjust as needed
	withCredentials: true,
});

// Add JWT token to Authorization header if available
instance.interceptors.request.use(
	(config) => {
		const token = localStorage.getItem('jwt_token');
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
			console.log(`[Axios] Sending request to ${config.url} with token`);
		} else {
			console.log(`[Axios] Sending request to ${config.url} WITHOUT token`);
		}
		return config;
	},
	(error) => {
		return Promise.reject(error);
	}
);

// Handle token expiration and responses
instance.interceptors.response.use(
	(response) => {
		// If response contains a token, save it
		if (response.data.token) {
			localStorage.setItem('jwt_token', response.data.token);
			console.log('[Axios] Token received and saved from response');
		}
		return response;
	},
	(error) => {
		if (error.response?.status === 401) {
			console.error('[Axios] 401 Unauthorized - clearing token and redirecting');
			// Clear token and redirect on unauthorized response
			localStorage.removeItem('jwt_token');
			localStorage.removeItem('user');
			// Redirect to signin only if not already there
			if (window.location.pathname !== '/signin') {
				window.location.href = '/signin';
			}
		}
		return Promise.reject(error);
	}
);

export default instance;
