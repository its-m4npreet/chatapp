import React, { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, X, AlertCircle, CheckCircle } from "lucide-react";
import axios from "../lib/axios";

export default function BugReport() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    steps: "",
    severity: "medium",
    affectedFeature: "",
    images: [],
    email: JSON.parse(localStorage.getItem("user") || "{}").email || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [imagePreviews, setImagePreviews] = useState([]);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
  }, []);

  const handleImageUpload = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;

    if (formData.images.length + files.length > 5) {
      setError("You can upload maximum 5 images");
      return;
    }

    // Check file sizes (max 5MB per file)
    const invalidFiles = files.filter((file) => file.size > 5 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      setError("Some files are too large (max 5MB per file)");
      return;
    }

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreviews((prev) => [...prev, event.target.result]);
        setFormData((prev) => ({
          ...prev,
          images: [...prev.images, event.target.result],
        }));
      };
      reader.readAsDataURL(file);
    });
  }, [formData.images.length]);

  const handleRemoveImage = useCallback((index) => {
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  }, []);

  const isFormValid = useMemo(() => {
    return (
      formData.title.trim() &&
      formData.description.trim() &&
      formData.steps.trim() &&
      formData.email.trim()
    );
  }, [formData]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setError("");
      setLoading(true);

      try {
        if (!isFormValid) {
          setError("Please fill in all required fields");
          setLoading(false);
          return;
        }

        const submitData = {
          title: formData.title,
          description: formData.description,
          steps: formData.steps,
          severity: formData.severity,
          affectedFeature: formData.affectedFeature,
          email: formData.email,
          images: formData.images,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
        };

        await axios.post("/send-bug-report", submitData);
        setSuccess(true);

        // Reset form
        setFormData({
          title: "",
          description: "",
          steps: "",
          severity: "medium",
          affectedFeature: "",
          images: [],
          email: JSON.parse(localStorage.getItem("user") || "{}").email || "",
        });
        setImagePreviews([]);

        // Auto-redirect after 3 seconds
        setTimeout(() => {
          navigate(-1);
        }, 3000);
      } catch (err) {
        setError(
          err.response?.data?.message || "Failed to submit bug report. Please try again."
        );
      } finally {
        setLoading(false);
      }
    },
    [formData, isFormValid, navigate]
  );

  const bgStyles = useMemo(
    () => ({
      backgroundImage: `
        linear-gradient(to right, #d1d5db 1px, transparent 1px),
        linear-gradient(to bottom, #d1d5db 1px, transparent 1px)
      `,
      backgroundSize: "40px 40px",
      WebkitMaskImage:
        "radial-gradient(ellipse 100% 50% at 50% 10%, #000 30%, transparent 70%)",
      maskImage:
        "radial-gradient(ellipse 100% 50% at 50% 10%, #000 30%, transparent 70%)",
    }),
    []
  );

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#0b0e12] relative">
      <div
        className="absolute top-0 inset-0 z-0 opacity-10"
        style={bgStyles}
      />

      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur-sm border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-[#0b0e12]">
        <div className="p-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Report a Bug
            </h2>
            <p className="text-gray-600 dark:text-gray-500 text-sm">
              Help us improve ChatApp by reporting issues
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 md:p-6 overflow-y-auto relative z-10">
        <div className="max-w-2xl mx-auto">
          {success && (
            <div className="mb-6 p-4 bg-green-600/20 border border-green-500 rounded-lg flex gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-green-600 dark:text-green-400 font-medium mb-1">
                  Bug Report Submitted
                </h3>
                <p className="text-green-600 dark:text-green-400 text-sm">
                  Thank you! We've received your bug report. Our team will review it shortly.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-600/20 border border-red-500 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-red-600 dark:text-red-400 font-medium mb-1">
                  Error
                </h3>
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Bug Title */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Bug Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., Messages not loading in chat"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4f38f7] focus:border-transparent"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe the bug in detail. What were you doing when this happened?"
                rows="4"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4f38f7] focus:border-transparent resize-none"
              />
            </div>

            {/* Steps to Reproduce */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Steps to Reproduce <span className="text-red-500">*</span>
              </label>
              <textarea
                name="steps"
                value={formData.steps}
                onChange={handleInputChange}
                placeholder="1. First step&#10;2. Second step&#10;3. What happens (the bug)"
                rows="4"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4f38f7] focus:border-transparent resize-none"
              />
            </div>

            {/* Affected Feature */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Affected Feature
              </label>
              <select
                name="affectedFeature"
                value={formData.affectedFeature}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4f38f7] focus:border-transparent"
              >
                <option value="">Select a feature</option>
                <option value="messaging">Messaging</option>
                <option value="authentication">Authentication</option>
                <option value="profile">Profile</option>
                <option value="settings">Settings</option>
                <option value="notifications">Notifications</option>
                <option value="ui">User Interface</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Severity
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: "low", label: "Low", color: "border-blue-500 bg-blue-50 dark:bg-blue-900/20" },
                  {
                    value: "medium",
                    label: "Medium",
                    color: "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20",
                  },
                  { value: "high", label: "High", color: "border-red-500 bg-red-50 dark:bg-red-900/20" },
                ].map((severity) => (
                  <button
                    key={severity.value}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, severity: severity.value }))
                    }
                    className={`p-3 rounded-lg border-2 font-medium transition-all ${
                      formData.severity === severity.value
                        ? severity.color
                        : "border-gray-300 dark:border-zinc-600"
                    }`}
                  >
                    {severity.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Add Screenshots/Images <span className="text-gray-500 text-xs">(Max 5 images, 5MB each)</span>
              </label>
              <div className="relative">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={imagePreviews.length >= 5}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    imagePreviews.length >= 5
                      ? "border-gray-300 dark:border-zinc-600 opacity-50 cursor-not-allowed"
                      : "border-gray-300 dark:border-zinc-600 hover:border-[#4f38f7] dark:hover:border-[#4f38f7]"
                  }`}
                >
                  <Upload size={24} className="text-gray-400 dark:text-gray-500 mb-2" />
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                    {imagePreviews.length >= 5
                      ? "Maximum images reached"
                      : "Click to upload or drag and drop"}
                  </p>
                  <p className="text-gray-500 dark:text-gray-500 text-xs">
                    PNG, JPG, GIF up to 5MB ({imagePreviews.length}/5)
                  </p>
                </label>
              </div>

              {/* Image Previews */}
              {imagePreviews.length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-gray-300 dark:border-zinc-600"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="your@email.com"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4f38f7] focus:border-transparent"
              />
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                We'll use this email to follow up with you about the bug
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !isFormValid || success}
              className="w-full bg-[#4f38f7] hover:bg-[#6c50f9] text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </>
              ) : success ? (
                "Submitted!"
              ) : (
                "Submit Bug Report"
              )}
            </button>
          </form>

          {/* Info Box */}
          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="text-blue-900 dark:text-blue-300 font-medium mb-2">
              Tips for better bug reports:
            </h4>
            <ul className="text-blue-800 dark:text-blue-400 text-sm space-y-1">
              <li>• Be specific and detailed in your description</li>
              <li>• Include exact steps to reproduce the issue</li>
              <li>• Add screenshots if possible</li>
              <li>• Mention your device type and browser</li>
              <li>• Check if the bug persists after refreshing the page</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
