import React from "react";
import { GoogleLogin } from "@react-oauth/google";
import axios from "../lib/axios";
import { useNavigate } from "react-router-dom";

export default function GoogleAuthButton({ onSuccess, onError }) {
  const navigate = useNavigate();

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const response = await axios.post("/google-auth", {
        credential: credentialResponse.credential,
      });

      if (response.data && response.data.user) {
        localStorage.setItem("user", JSON.stringify(response.data.user));
        if (response.data.token) {
          localStorage.setItem("jwt_token", response.data.token);
        }
      }

      if (onSuccess) {
        onSuccess(response.data);
      } else {
        navigate("/");
      }
    } catch (error) {
      console.error("Google Auth Error:", error);
      const errorMessage =
        error.response?.data?.message || "Google authentication failed";
      if (onError) {
        onError(errorMessage);
      }
    }
  };

  const handleGoogleError = () => {
    const errorMessage = "Google login failed. Please try again.";
    if (onError) {
      onError(errorMessage);
    }
  };

  return (
    <GoogleLogin
      onSuccess={handleGoogleSuccess}
      onError={handleGoogleError}
      width="100%"
      theme="dark"
      text="signin_with"
    />
  );
}
