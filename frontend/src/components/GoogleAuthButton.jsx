import React , {useEffect, useLayoutEffect, useRef , useState} from "react";
import { GoogleLogin } from "@react-oauth/google";
import axios from "../lib/axios";
import { useNavigate } from "react-router-dom";

export default function GoogleAuthButton({ onSuccess, onError, className = "" }) {

  const signInBtnRef = useRef(null);
const [googleWidth, setGoogleWidth] = useState(300);

useLayoutEffect(() => {
  if (signInBtnRef.current) {
    setGoogleWidth(signInBtnRef.current.offsetWidth);
  }
}, []);


useEffect(() => {
  const updateWidth = () => {
    if (signInBtnRef.current) {
      setGoogleWidth(signInBtnRef.current.offsetWidth);
    }
  };

  updateWidth();
  window.addEventListener("resize", updateWidth);
  return () => window.removeEventListener("resize", updateWidth);
}, []);


  const navigate = useNavigate();

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const response = await axios.post("/google-auth", {
        credential: credentialResponse.credential,
      });

      if (response.data?.user) {
        localStorage.setItem("user", JSON.stringify(response.data.user));
        if (response.data.token) {
          localStorage.setItem("jwt_token", response.data.token);
        }
      }

      onSuccess ? onSuccess(response.data) : navigate("/");
    } catch (error) {
      console.error("Google Auth Error:", error);
      onError?.(
        error.response?.data?.message || "Google authentication failed"
      );
    }
  };

  return (
    <div className={`w-full flex justify-center ${className}`}>
      <GoogleLogin
        onSuccess={handleGoogleSuccess}
        onError={() =>
          onError?.("Google login failed. Please try again.")
        }
        theme="outline"
        size="large"
        width={googleWidth}   // ✅ MUST be number, not "px"
        text="signin_with"
      />
    </div>
  );
}


